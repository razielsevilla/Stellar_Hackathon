const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  events: require.resolve('events'),
  url: require.resolve('url'),
  http: require.resolve('events'),
  https: require.resolve('events'),
};

module.exports = config;
