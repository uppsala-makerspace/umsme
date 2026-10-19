import React, { useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import { Statistics } from './Statistics';
import { membershipStatistics } from './data';

export const StatisticsPage = () => {
  const [interval, setPeriod] = useState('all');
  const [statistics, setStatistics] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let current = true;
    membershipStatistics(interval).then((s) => { if (current) setStatistics(s); }, (e) => setError(e.reason || e.message));
    return () => { current = false; };
  }, [interval]);
  if (error) return <Alert severity="error">{error}</Alert>;
  return <Statistics statistics={statistics} interval={interval} onIntervalChange={setPeriod} />;
};
