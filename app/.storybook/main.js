/** @type { import('@storybook/react-webpack5').StorybookConfig } */
const config = {
  "stories": [
    "../imports/**/*.mdx",
    "../imports/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "staticDirs": ["../public"],
  "addons": [
    "@storybook/addon-webpack5-compiler-swc",
    "@storybook/addon-docs",
    "@storybook/addon-onboarding",
    {
      name: '@storybook/addon-styling-webpack',
      options: {
        rules: [
          // Replaces existing CSS rules with given rule
          {
            test: /\.css$/,
            use: [
              'style-loader',
              {
                loader: "css-loader",
                options: {
                  url: false, // This was the important key ** see explanation
                },
              },
            ],
          }
        ]
      }
    }
  ],
  "framework": {
    "name": "@storybook/react-webpack5",
    "options": {}
  },
  webpackFinal: async (config) => {
//    console.log(JSON.stringify(config, undefined, '  '));
    return {
      ...config,
    };
  },
};
export default config;