import React, { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import { Revenue } from './Revenue';
import { revenue } from './data';

export const RevenuePage = () => {
  const [model, setModel] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { revenue().then(setModel, (e) => setError(e.reason || e.message)); }, []);
  if (error) return <Alert severity="error">{error}</Alert>;
  return <Revenue model={model} />;
};
