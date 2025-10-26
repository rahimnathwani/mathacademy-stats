import { useEffect, useState, useRef } from 'react';
import type { Activity } from '@/types/mathacademy';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import './histograms.css';
import { calculateHistograms, type HistogramData } from './histogram-calculations';

interface HistogramChartProps {
  title: string;
  bins: number[];
  counts: number[];
  color: string;
}

function HistogramChart({ title, bins, counts, color }: HistogramChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!chartRef.current || bins.length === 0) return;

    const maxCount = Math.max(...counts, 1);

    const opts: uPlot.Options = {
      width: chartRef.current.clientWidth,
      height: 300,
      cursor: { show: false },
      legend: { show: false },
      scales: {
        x: {
          time: false,
          auto: false,
          range: [0, 8],
        },
        y: {
          auto: false,
          range: [0, maxCount * 1.1],
        },
      },
      axes: [
        {
          show: true,
          stroke: '#888',
          size: 40,
          grid: { show: true, stroke: '#333' },
          ticks: { show: true, stroke: '#888' },
          font: '12px sans-serif',
          label: 'XP per Minute',
          labelSize: 20,
          labelFont: '14px sans-serif',
        },
        {
          show: true,
          stroke: '#888',
          size: 60,
          grid: { show: true, stroke: '#333' },
          ticks: { show: true, stroke: '#888' },
          font: '12px sans-serif',
          label: 'Count',
          labelSize: 20,
          labelFont: '14px sans-serif',
        },
      ],
      series: [
        {},
        {
          stroke: color,
          fill: color,
          paths: (u, seriesIdx) => {
            const bucketWidth = 0.25;
            const barWidthRatio = 0.9;

            let d = '';

            for (let i = 0; i < u.data[0].length; i++) {
              const binStart = u.data[0][i] as number;
              const count = u.data[1][i] as number;

              if (count == null || count === 0) continue;

              const barLeft = binStart;
              const barRight = binStart + bucketWidth * barWidthRatio;

              const x0 = Math.round(u.valToPos(barLeft, 'x', true));
              const x1 = Math.round(u.valToPos(barRight, 'x', true));
              const y0 = Math.round(u.valToPos(0, 'y', true));
              const y1 = Math.round(u.valToPos(count, 'y', true));

              // Draw rectangle using SVG path commands
              d += `M${x0},${y0}L${x0},${y1}L${x1},${y1}L${x1},${y0}Z`;
            }

            return { stroke: new Path2D(d), fill: new Path2D(d) };
          },
        },
      ],
      padding: [10, 10, 0, 10],
    };

    const data: uPlot.AlignedData = [bins, counts];

    plotRef.current = new uPlot(opts, data, chartRef.current);

    return () => {
      if (plotRef.current) {
        plotRef.current.destroy();
        plotRef.current = null;
      }
    };
  }, [bins, counts, color]);

  return (
    <div className="histogram-chart-container">
      <h3 className="histogram-title">{title}</h3>
      <div className="histogram-chart" ref={chartRef}></div>
    </div>
  );
}

interface CourseHistogramsProps {
  data: HistogramData;
}

function CourseHistograms({ data }: CourseHistogramsProps) {
  const lessonTotal = data.lessons.counts.reduce((sum, count) => sum + count, 0);
  const reviewTotal = data.reviews.counts.reduce((sum, count) => sum + count, 0);

  return (
    <div className="course-histograms">
      <h2 className="course-name">{data.courseName}</h2>
      <div className="histograms-row">
        <HistogramChart
          title={`Lessons (n=${lessonTotal})`}
          bins={data.lessons.bins}
          counts={data.lessons.counts}
          color="rgb(59, 130, 246)"
        />
        <HistogramChart
          title={`Reviews (n=${reviewTotal})`}
          bins={data.reviews.bins}
          counts={data.reviews.counts}
          color="rgb(139, 92, 246)"
        />
      </div>
    </div>
  );
}

export default function HistogramPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [histograms, setHistograms] = useState<HistogramData[]>([]);

  useEffect(() => {
    browser.storage.local.get('activitiesData').then((result) => {
      if (result.activitiesData) {
        const activitiesData = result.activitiesData as Activity[];
        setActivities(activitiesData);
        const histogramData = calculateHistograms(activitiesData);
        setHistograms(histogramData);
        setLoading(false);
      } else {
        setError('No activities data found. Please fetch data from the popup first.');
        setLoading(false);
      }
    }).catch((err) => {
      setError(`Error loading activities: ${err.message}`);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="histograms-container">
        <h1>Loading...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="histograms-container">
        <h1>Error</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="histograms-container">
        <h1>No Activities</h1>
        <p>No activities available to display.</p>
      </div>
    );
  }

  return (
    <div className="histograms-container">
      <h1 className="page-title">XP per Minute Histograms</h1>
      <p className="page-subtitle">Distribution of XP earned per minute for lessons and reviews by course</p>

      {histograms.map((histogram) => (
        <CourseHistograms key={histogram.courseName} data={histogram} />
      ))}
    </div>
  );
}
