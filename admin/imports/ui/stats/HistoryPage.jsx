import React, { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import { History } from './History';
import { memberHistory } from './data';

export const HistoryPage = () => {
  const [history, setHistory] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('active');
  useEffect(() => { memberHistory().then(setHistory, (e) => setError(e.reason || e.message)); }, []);
  if (error) return <Alert severity="error">{error}</Alert>;
  return <History loading={!history} stats={history?.stats} rows={history?.rows || []} filter={filter} onFilterChange={setFilter} />;
};
