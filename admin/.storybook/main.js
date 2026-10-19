const path = require('path');

/**
 * Storybook for admin's React pages (port 6007; the app's is on 6006).
 * Stories sit next to their components in imports/ui. The components they
 * show are pure: no Meteor, no router. For a component that does reach for
 * Meteor, the app's stubs are aliased in, as is /imports.
 *
 * @type { import('@storybook/react-webpack5').StorybookConfig }
 */
module.exports = {
  stories: ['../imports/**/*.stories.@(js|jsx)'],
  addons: ['@storybook/addon-webpack5-compiler-swc', '@storybook/addon-docs'],
  framework: { name: '@storybook/react-webpack5', options: {} },
  webpackFinal: async (config) => {
    const appStubs = path.resolve(__dirname, '../../app/.storybook/stubs');
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      'meteor/meteor': path.join(appStubs, 'meteor.js'),
      'meteor/react-meteor-data': path.join(appStubs, 'react-meteor-data.js'),
      '/imports': path.resolve(__dirname, '../imports'),
    };
    config.resolve.modules = [path.resolve(__dirname, '../node_modules'), ...(config.resolve.modules || ['node_modules'])];
    return config;
  },
};
