import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

export interface CategoricalBarChartProps {
  title: string;
  labels: string[];
  values: number[];
  /** One color for all bars, or one color per bar. */
  colors: string | string[];
  height?: number;
  /** Bar width as a fraction of each category slot. */
  barWidthRatio?: number;
  /** Draw the numeric value above each bar. */
  showValueLabels?: boolean;
  /** Extra canvas drawing after the bars (e.g. mean/median lines). */
  drawExtra?: (u: uPlot) => void;
}

/**
 * A categorical bar chart rendered with uPlot.
 *
 * uPlot has no native bar type, so bars are drawn in a `draw` hook against a
 * numeric x-axis of category indices.
 */
export function CategoricalBarChart({
  title,
  labels,
  values,
  colors,
  height = 400,
  barWidthRatio = 0.7,
  showValueLabels = false,
  drawExtra,
}: CategoricalBarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  // Callers pass freshly mapped arrays on every render; keying the effect on
  // content instead of array identity avoids destroying and rebuilding the
  // canvas when nothing actually changed.
  const dataKey = JSON.stringify({ labels, values, colors });

  useEffect(() => {
    if (!chartRef.current || values.length === 0) return;

    const xData = values.map((_, i) => i);
    const barColors = Array.isArray(colors) ? colors : values.map(() => colors);

    const opts: uPlot.Options = {
      width: chartRef.current.clientWidth,
      height,
      title,
      cursor: { show: false },
      legend: { show: false },
      scales: {
        x: {
          time: false,
          range: [-0.5, values.length - 0.5],
        },
        y: { auto: true },
      },
      axes: [
        {
          show: true,
          stroke: '#888',
          size: 60,
          grid: { show: false },
          ticks: { show: false },
          font: '13px sans-serif',
          // One tick per category; without explicit splits uPlot may pick a
          // coarser increment and pair labels with the wrong ticks.
          splits: () => xData,
          values: (_u, splits) => splits.map((i) => labels[i] ?? ''),
        },
        {
          show: true,
          stroke: '#888',
          size: 60,
          grid: { show: true, stroke: '#eee' },
          ticks: { show: true },
          font: '13px sans-serif',
        },
      ],
      series: [
        {},
        {
          stroke: 'transparent',
          width: 0,
        },
      ],
      hooks: {
        draw: [
          (u) => {
            const ctx = u.ctx;
            const barWidthPx = (u.bbox.width / values.length) * barWidthRatio;

            for (let i = 0; i < xData.length; i++) {
              const x = u.valToPos(i, 'x', true);
              const y = u.valToPos(values[i], 'y', true);
              const y0 = u.valToPos(0, 'y', true);

              ctx.fillStyle = barColors[i];
              ctx.fillRect(x - barWidthPx / 2, y, barWidthPx, y0 - y);

              if (showValueLabels) {
                ctx.fillStyle = '#24292e';
                ctx.font = 'bold 13px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(values[i].toString(), x, y - 8);
              }
            }

            drawExtra?.(u);
          },
        ],
      },
      padding: [showValueLabels ? 60 : 40, 10, 0, 10],
    };

    plotRef.current = new uPlot(opts, [xData, values], chartRef.current);

    return () => {
      plotRef.current?.destroy();
      plotRef.current = null;
    };
    // labels/values/colors are covered by dataKey (content comparison)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, dataKey, height, barWidthRatio, showValueLabels, drawExtra]);

  return <div ref={chartRef} className="chart"></div>;
}
