import React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';

/**
 * What shows when a page could not be loaded (App.jsx loads each page when
 * it is first shown): most often admin was updated meanwhile, and a reload
 * brings the new version.
 *
 * @param {{ onReload: () => void }} props
 */
export const PageLoadError = ({ onReload }) => (
  <Alert severity="error" action={<Button color="inherit" size="small" onClick={onReload}>Reload</Button>}>
    The page could not be loaded. Admin may have been updated meanwhile; reloading brings the new version.
  </Alert>
);
