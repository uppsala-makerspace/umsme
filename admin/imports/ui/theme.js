import { createTheme } from '@mui/material/styles';

/** The MUI theme for admin. */
export const theme = createTheme({
  palette: {
    primary: { main: '#660000', light: '#990000' },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});
