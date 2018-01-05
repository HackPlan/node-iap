var proxyingAgent = require('proxying-agent')

var agents = {
  apple: null,
  google: null,
}

var domains = {}

exports.setDomain = function (domain, newDomain) {
  domains[domain] = newDomain;
}

exports.getDomain = function (domain) {
  return domains[domain] || domain;
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