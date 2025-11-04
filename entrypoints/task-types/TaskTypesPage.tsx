import { useEffect, useState, useRef } from 'react';
import type { Activity } from '@/types/mathacademy';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

interface TaskTypeData {
  type: string;
  count: number;
  totalXP: number;
  avgXP: number;
  color: string;
}

const TASK_TYPE_COLORS: Record<string, string> = {
  'lesson': '#2E86AB',
  'review': '#A23B72',
  'quiz': '#C73E1D',
  'multistep': '#F18F01',
  'diagnostic': '#6A994E',
};

function classifyTaskType(activity: Activity): string {
  const topicName = activity.topic.name?.toLowerCase() || '';

  if (topicName.includes('quiz')) return 'quiz';
  if (topicName.includes('review')) return 'review';
  if (topicName.includes('multistep')) return 'multistep';
  if (topicName.includes('diagnostic') || topicName.includes('placement')) return 'diagnostic';
  return 'lesson';
}

function calculateTaskTypeData(activities: Activity[]): TaskTypeData[] {
  const typeMap = new Map<string, { count: number; totalXP: number }>();

  activities.forEach(activity => {
    const type = classifyTaskType(activity);
    const xp = activity.pointsAwarded;

    if (!typeMap.has(type)) {
      typeMap.set(type, { count: 0, totalXP: 0 });
    }

    const data = typeMap.get(type)!;
    data.count++;
    data.totalXP += xp;
  });

  return Array.from(typeMap.entries()).map(([type, data]) => ({
    type,
    count: data.count,
    totalXP: data.totalXP,
    avgXP: Math.round(data.totalXP / data.count),
    color: TASK_TYPE_COLORS[type] || '#6B7280',
  })).sort((a, b) => b.count - a.count);
}

export default function TaskTypesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const countChartRef = useRef<HTMLDivElement>(null);
  const xpChartRef = useRef<HTMLDivElement>(null);
  const plotCountRef = useRef<uPlot | null>(null);
  const plotXPRef = useRef<uPlot | null>(null);

  useEffect(() => {
    browser.storage.local.get('activitiesData').then((result) => {
      if (result.activitiesData) {
        setActivities(result.activitiesData as Activity[]);
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

  useEffect(() => {
    if (activities.length === 0 || !countChartRef.current || !xpChartRef.current) return;

    const taskData = calculateTaskTypeData(activities);

    // Create bar charts using uPlot
    const createBarChart = (
      container: HTMLDivElement,
      data: TaskTypeData[],
      valueKey: 'count' | 'totalXP',
      title: string
    ) => {
      const labels = data.map(d => d.type.charAt(0).toUpperCase() + d.type.slice(1));
      const values = data.map(d => d[valueKey]);
      const colors = data.map(d => d.color);

      // Create x-axis as categorical indices
      const xData = data.map((_, i) => i);

      const opts: uPlot.Options = {
        width: container.clientWidth,
        height: 400,
        title,
        cursor: { show: false },
        legend: { show: false },
        scales: {
          x: {
            time: false,
            range: [-0.5, data.length - 0.5]
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
            values: (_self, _splits) => labels,
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
              const barWidth = 0.6;

              for (let i = 0; i < xData.length; i++) {
                const x = u.valToPos(i, 'x', true);
                const y = u.valToPos(values[i], 'y', true);
                const y0 = u.valToPos(0, 'y', true);
                const barWidthPx = (u.bbox.width / data.length) * barWidth;

                ctx.fillStyle = colors[i];
                ctx.fillRect(
                  x - barWidthPx / 2,
                  y,
                  barWidthPx,
                  y0 - y
                );
              }
            },
          ],
        },
        padding: [40, 10, 0, 10],
      };

      const plotData: uPlot.AlignedData = [xData, values];
      return new uPlot(opts, plotData, container);
    };

    plotCountRef.current = createBarChart(
      countChartRef.current,
      taskData,
      'count',
      'Task Count by Type'
    );

    plotXPRef.current = createBarChart(
      xpChartRef.current,
      taskData,
      'totalXP',
      'Total XP by Task Type'
    );

    return () => {
      if (plotCountRef.current) {
        plotCountRef.current.destroy();
        plotCountRef.current = null;
      }
      if (plotXPRef.current) {
        plotXPRef.current.destroy();
        plotXPRef.current = null;
      }
    };
  }, [activities]);

  if (loading) {
    return (
      <div className="task-types-container">
        <h1>Loading...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-types-container">
        <h1>Error</h1>
        <p className="error">{error}</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="task-types-container">
        <h1>No Activities</h1>
        <p>No activities available to display.</p>
      </div>
    );
  }

  const taskData = calculateTaskTypeData(activities);
  const totalCount = taskData.reduce((sum, d) => sum + d.count, 0);
  const totalXP = taskData.reduce((sum, d) => sum + d.totalXP, 0);

  return (
    <div className="task-types-container">
      <div className="task-types-header">
        <h1>Task Type Distribution</h1>
        <p className="task-types-subtitle">
          Breakdown of your {totalCount.toLocaleString()} activities earning{' '}
          {totalXP.toLocaleString()} total XP
        </p>
      </div>

      <div className="task-types-grid">
        {taskData.map(task => (
          <div key={task.type} className="task-type-card">
            <div
              className="task-type-indicator"
              style={{ backgroundColor: task.color }}
            />
            <div className="task-type-info">
              <div className="task-type-name">
                {task.type.charAt(0).toUpperCase() + task.type.slice(1)}s
              </div>
              <div className="task-type-stats">
                <div className="task-type-stat">
                  <span className="stat-value">{task.count.toLocaleString()}</span>
                  <span className="stat-label">
                    ({((task.count / totalCount) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="task-type-stat">
                  <span className="stat-value">{task.totalXP.toLocaleString()} XP</span>
                  <span className="stat-label">
                    ({((task.totalXP / totalXP) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="task-type-stat">
                  <span className="stat-value">{task.avgXP} avg</span>
                  <span className="stat-label">XP per task</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-section">
        <div className="chart-wrapper">
          <div ref={countChartRef} className="chart"></div>
        </div>
        <div className="chart-wrapper">
          <div ref={xpChartRef} className="chart"></div>
        </div>
      </div>
    </div>
  );
}
