import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import 'bootstrap/dist/css/bootstrap.min.css';
import { theme } from '../imports/ui/theme';

/**
 * Stories render as in admin: with the MUI theme, and on top of Bootstrap 3,
 * whose 10px root font size the theme is set up for.
 *
 * @type { import('@storybook/react-webpack5').Preview }
 */
const preview = {
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <div id="react-page" style={{ padding: 16, fontFamily: 'sans-serif' }}>
          <Story />
        </div>
      </ThemeProvider>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { matchers: { date: /Date$/i } },
  },
};

export default preview;
