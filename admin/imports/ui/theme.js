import { createTheme } from '@mui/material/styles';

/**
 * The MUI theme for admin's React pages. While Bootstrap 3 is around it sets
 * html { font-size: 10px }; htmlFontSize tells MUI so, and its rem sizes come
 * out right. Remove that line when Bootstrap goes.
 */
export const theme = createTheme({
  typography: { htmlFontSize: 10 },
  palette: {
    primary: { main: '#660000', light: '#990000' },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});
