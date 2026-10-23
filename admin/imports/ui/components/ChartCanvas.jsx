import React, { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-moment';

/**
 * A Chart.js chart, as wide as there is room for and `height` tall: pages
 * take the full width, and a chart keeping its proportions would grow as
 * tall as it is wide. Drawn again whenever `config` changes, so build it
 * with useMemo. `label` names the chart for screen readers.
 *
 * @param {{ config: object, label: string, height?: number }} props
 */
export const ChartCanvas = ({ config, label, height = 360 }) => {
  const canvas = useRef(null);
  useEffect(() => {
    const chart = new Chart(canvas.current, { ...config, options: { ...config.options, maintainAspectRatio: false } });
    return () => chart.destroy();
  }, [config]);
  return (
    <Box sx={{ position: 'relative', height }}>
      <canvas ref={canvas} role="img" aria-label={label} />
    </Box>
  );
};
