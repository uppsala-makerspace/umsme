import React from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../imports/ui/theme';

/**
 * Stories render as in admin: with the MUI theme and its baseline.
 *
 * @type { import('@storybook/react-webpack5').Preview }
 */
const preview = {
  decorators: [
    (Story) => (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div style={{ padding: 16 }}>
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
