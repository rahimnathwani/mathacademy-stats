import { useMemo } from 'react';
import type { Activity } from '@/types/mathacademy';
import { classifyActivity, type ActivityCategory } from '@/utils/classify-activity';
import { useStoredActivities } from '@/hooks/useStoredActivities';
import { PageStatus } from '@/components/PageStatus';
import { CategoricalBarChart } from '@/components/CategoricalBarChart';

interface TaskTypeData {
  type: ActivityCategory;
  count: number;
  totalXP: number;
  avgXP: number;
  color: string;
}

const TASK_TYPE_COLORS: Record<ActivityCategory, string> = {
  lesson: '#2E86AB',
  review: '#A23B72',
  quiz: '#C73E1D',
  multistep: '#F18F01',
  diagnostic: '#6A994E',
  other: '#6B7280',
};

function calculateTaskTypeData(activities: Activity[]): TaskTypeData[] {
  const typeMap = new Map<ActivityCategory, { count: number; totalXP: number }>();

  activities.forEach((activity) => {
    const type = classifyActivity(activity);

    if (!typeMap.has(type)) {
      typeMap.set(type, { count: 0, totalXP: 0 });
    }

    const data = typeMap.get(type)!;
    data.count++;
    data.totalXP += activity.pointsAwarded;
  });

  return Array.from(typeMap.entries())
    .map(([type, data]) => ({
      type,
      count: data.count,
      totalXP: data.totalXP,
      avgXP: Math.round(data.totalXP / data.count),
      color: TASK_TYPE_COLORS[type],
    }))
    .sort((a, b) => b.count - a.count);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function TaskTypesPage() {
  const { activities, loading, error, ready } = useStoredActivities();
  const taskData = useMemo(() => calculateTaskTypeData(activities), [activities]);

  if (!ready) {
    return <PageStatus className="task-types-container" loading={loading} error={error} />;
  }

  const totalCount = taskData.reduce((sum, d) => sum + d.count, 0);
  const totalXP = taskData.reduce((sum, d) => sum + d.totalXP, 0);
  const labels = taskData.map((d) => capitalize(d.type));
  const colors = taskData.map((d) => d.color);

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
        {taskData.map((task) => (
          <div key={task.type} className="task-type-card">
            <div className="task-type-indicator" style={{ backgroundColor: task.color }} />
            <div className="task-type-info">
              <div className="task-type-name">{capitalize(task.type)}s</div>
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
          <CategoricalBarChart
            title="Task Count by Type"
            labels={labels}
            values={taskData.map((d) => d.count)}
            colors={colors}
            barWidthRatio={0.6}
          />
        </div>
        <div className="chart-wrapper">
          <CategoricalBarChart
            title="Total XP by Task Type"
            labels={labels}
            values={taskData.map((d) => d.totalXP)}
            colors={colors}
            barWidthRatio={0.6}
          />
        </div>
      </div>
    </div>
  );
}
