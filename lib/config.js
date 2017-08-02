var proxyingAgent = require('proxying-agent')

var agents = {
  apple: null,
  google: null,
}

exports.setProxy = function (platform, config) {
  if (config) {
    agents[platform] = proxyingAgent.create(config, "https://localhost");
  } else {
    agents[platform] = null;
  }
}

exports.getAgent = function (platform) {
  return agents[platform];
}