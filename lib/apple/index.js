var assert = require('assert');
var https = require('../https');

var apiUrls = {
	sandbox: 'https://sandbox.itunes.apple.com/verifyReceipt',
	production: 'https://buy.itunes.apple.com/verifyReceipt'
};

function NetworkError(message) {
  this.message = message;
  this.name = "NetworkError";
}
NetworkError.prototype = new Error();
NetworkError.prototype.constructor = NetworkError;

var responses = {
	'21000': 'The App Store could not read the JSON object you provided.',
	'21002': 'The data in the receipt-data property was malformed or missing.',
	'21003': 'The receipt could not be authenticated.',
	'21004': 'The shared secret you provided does not match the shared secret on file for your account.',
	'21005': 'The receipt server is not currently available.',
	'21006': 'This receipt is valid but the subscription has expired. When this status code is returned to your server, the receipt data is also decoded and returned as part of the response.',
	'21007': 'This receipt is from the test environment, but it was sent to the production service for verification. Send it to the test environment service instead.',
	'21008': 'This receipt is from the production receipt, but it was sent to the test environment service for verification. Send it to the production environment service instead.'
};


function parseResult(result) {
	result = JSON.parse(result);

	var status = parseInt(result.status, 10);

	if (status !== 0) {
		if (status == 21005) {
			var msg = responses[status];

			var error = new NetworkError(msg);
			error.status = status;

			throw error;
		} else {
			return {
				result: 'failed',
				message: responses[status] || 'Unknown status code: ' + status
			};
		}
	}

	if (result.latest_receipt_info) {
		var latest_receipt_info = result.latest_receipt_info.sort(function(a, b){return b.expires_date_ms - a.expires_date_ms})[0];
	} else {
		var latest_receipt_info = {};
	}

	return {
		result: 'verified',
		detail: result,
		receipt: result.receipt,
		latest_receipt: result.latest_receipt,
		latest_receipt_info: latest_receipt_info
	};
}


function verify(environmentUrl, options, cb) {
	https.post(environmentUrl, options, function (error, res, resultString) {
		if (error) {
			return cb(error);
		}

		if (res.statusCode !== 200) {
			return cb(new NetworkError('Received ' + res.statusCode + ' status code with body: ' + resultString));
		}

		var resultObject;

		try {
			resultObject = parseResult(resultString);
		} catch (error) {
			return cb(error);
		}

		cb(null, resultObject);
	});
}


function isBase64like(str) {
	return !!str.match(/^[a-zA-Z0-9\/+]+\={0,2}$/);
}


exports.verifyPayment = function (payment, cb) {
	var jsonData = {};

	try {
		assert.equal(typeof payment.receipt, 'string', 'Receipt must be a string');

		jsonData['password'] = payment.password;
		if (isBase64like(payment.receipt)) {
			jsonData['receipt-data'] = payment.receipt;
		} else {
			jsonData['receipt-data'] = (new Buffer(payment.receipt, 'utf8')).toString('base64');
		}
	} catch (error) {
		return process.nextTick(function () {
			cb(error);
		});
	}


	function checkReceipt(error, result) {
		if (error) {
			return cb(error);
		}
		
		if (payment.hasOwnProperty('packageName') && result.result == 'verified' && payment.packageName !== result.receipt.bundle_id) {
			return cb(null, {
				result: 'failed',
				receipt: result.receipt,
				message: 'Wrong bundle ID: ' + result.receipt.bundle_id + ' (expected: ' + payment.packageName  + ')'
			});
		}

		return cb(null, result);
	}


	verify(apiUrls.production, { json: jsonData, platform: "apple" }, function (error, resultString) {
		// 21007: this is a sandbox receipt, so take it there
		if (error && error.status === 21007) {
			return verify(apiUrls.sandbox, { json: jsonData, platform: "apple" }, checkReceipt);
		}

		return checkReceipt(error, resultString);
	});
};
