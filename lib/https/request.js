var url = require('url');
var https = require('https');
var config = require('../config')

module.exports = function (requestUrl, options, data, cb) {
	options = options || {};

	var parsedUrl = url.parse(requestUrl);

	if (parsedUrl.hostname) {
		options.hostname = config.getDomain(parsedUrl.hostname);
	}

	if (parsedUrl.port) {
		options.port = parsedUrl.port;
	}

	if (parsedUrl.path) {
		options.path = parsedUrl.path;
	}

	if (options.platform) {
		options.agent = config.getAgent(options.platform);
		delete options.platform;
	}

	var req = https.request(options, function (res) {
		res.setEncoding('utf8');

		var responseData = '';

		res.on('data', function (str) {
			responseData += str;
		});

		res.on('end', function () {
			cb(null, res, responseData);
		});
	});
	req.setTimeout(10000);

	req.on('timeout', function () {
		cb(new Error('timeout'));
	});
	
	req.on('error', cb);

	req.end(data);
};