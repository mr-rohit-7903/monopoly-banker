const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withSplitApk(config) {
  return withAppBuildGradle(config, config => {
    if (config.modResults.contents.includes('def enableSeparateBuildPerCPUArchitecture = false')) {
      config.modResults.contents = config.modResults.contents.replace(
        /def enableSeparateBuildPerCPUArchitecture = false/,
        'def enableSeparateBuildPerCPUArchitecture = true'
      );
    }
    return config;
  });
};
