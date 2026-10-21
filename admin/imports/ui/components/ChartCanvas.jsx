import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-moment';

/**
 * A Chart.js chart. Drawn again whenever `config` changes, so build it with
 * useMemo. `label` names the chart for screen readers.
 *
 * @param {{ config: object, label: string }} props
 */
export const ChartCanvas = ({ config, label }) => {
  const canvas = useRef(null);
  useEffect(() => {
    const chart = new Chart(canvas.current, config);
    return () => chart.destroy();
  }, [config]);
  return <canvas ref={canvas} role="img" aria-label={label} />;
};
