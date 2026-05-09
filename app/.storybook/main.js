const path = require("path");

/** @type { import('@storybook/react-webpack5').StorybookConfig } */
module.exports = {
  stories: [
    "../imports/**/*.mdx",
    "../imports/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../../tutorial/stories/**/*.stories.@(js|jsx|tsx)",
  ],
  staticDirs: ["../public"],
  addons: [
    "@storybook/addon-webpack5-compiler-swc",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
    {
      name: "@storybook/addon-styling-webpack",
      options: {
        rules: [
          {
            test: /\.css$/,
            use: [
              "style-loader",
              { loader: "css-loader", options: { url: false } },
              "postcss-loader",
            ],
          },
        ],
      },
    },
    {
      name: "@storybook/addon-postcss",
      options: {
        cssLoaderOptions: { importLoaders: 1 },
        postcssLoaderOptions: { implementation: require("postcss") },
      },
    },
    "@storybook/addon-mcp",
  ],
  framework: { name: "@storybook/react-webpack5", options: {} },
  webpackFinal: async (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "meteor/meteor": path.resolve(__dirname, "./stubs/meteor.js"),
      "meteor/react-meteor-data": path.resolve(__dirname, "./stubs/react-meteor-data.js"),
    };
    config.resolve.modules = [
      path.resolve(__dirname, "../node_modules"),
      ...(config.resolve.modules || ["node_modules"]),
    ];
    return config;
  },
};
