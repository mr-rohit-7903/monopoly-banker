const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = function withSplitApk(config) {
  return withAppBuildGradle(config, config => {
    if (config.modResults.contents.includes('def enableSeparateBuildPerCPUArchitecture = false')) {
      config.modResults.contents = config.modResults.contents.replace(
        /def enableSeparateBuildPerCPUArchitecture = false/,
        'def enableSeparateBuildPerCPUArchitecture = true'
      );
    } else {
      if (!config.modResults.contents.includes('splits {')) {
        config.modResults.contents = config.modResults.contents.replace(
          /android\s*\{/,
          `android {\n    splits {\n        abi {\n            reset()\n            enable true\n            universalApk false\n            include "armeabi-v7a", "arm64-v8a", "x86", "x86_64"\n        }\n    }`
        );
      }
    }
    return config;
  });
};
