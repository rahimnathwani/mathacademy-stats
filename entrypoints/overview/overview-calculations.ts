import type { Activity } from '@/types/mathacademy';

/**
 * Daily aggregated data
 */
export interface DailyData {
  date: string; // YYYY-MM-DD format
  xp: number;
  count: number;
  totalPossible: number;
  totalEarned: number;
}

/**
 * Activity type counts
 */
export interface ActivityCounts {
  lessons: number;
  reviews: number;
  multisteps: number;
  quizzes: number;
  diagnostics: number;
}

/**
 * Convert a Date object to YYYY-MM-DD format in local timezone
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if an activity is a diagnostic (but not a quiz)
 */
function isDiagnostic(activity: Activity): boolean {
  const type = activity.type.toLowerCase();
  const taskName = activity.test?.name || '';
  const isQuiz = taskName.toLowerCase().includes('quiz');
  
  return !isQuiz && (
    type === 'diagnostic' || 
    type === 'assessment' || 
    type === 'supplemental diagnostic' ||
    type === 'placement' ||
    type === 'supplemental'
  );
}

/**
 * Check if an activity is a quiz
 */
function isQuiz(activity: Activity): boolean {
  const taskName = activity.test?.name || '';
  return taskName.toLowerCase().includes('quiz');
}

/**
 * Group activities by day
 */
export function groupActivitiesByDay(activities: Activity[]): DailyData[] {
  const dailyGroups: { [key: string]: DailyData } = {};

  activities.forEach(activity => {
    const date = new Date(activity.completed);
    const dateKey = toLocalDateString(date);
    
    if (!dailyGroups[dateKey]) {
      dailyGroups[dateKey] = {
        date: dateKey,
        xp: 0,
        count: 0,
        totalPossible: 0,
        totalEarned: 0,
      };
    }
    
    dailyGroups[dateKey].xp += activity.pointsAwarded || 0;
    dailyGroups[dateKey].count += 1;
    
    let earnedXP: number, possibleXP: number;
    
    if (isDiagnostic(activity)) {
      // For diagnostics: earned is both earned and possible (100% attainment)
      earnedXP = activity.pointsAwarded || 0;
      possibleXP = activity.pointsAwarded || 0;
    } else {
      // For other activities: use earned and base
      earnedXP = activity.pointsAwarded || 0;
      possibleXP = activity.points || 10;
    }
    
    dailyGroups[dateKey].totalPossible += possibleXP;
    dailyGroups[dateKey].totalEarned += earnedXP;
  });
  
  return Object.values(dailyGroups).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}

/**
 * Calculate total XP earned
 */
export function calculateTotalXP(activities: Activity[]): number {
  return activities.reduce((sum, activity) => sum + (activity.pointsAwarded || 0), 0);
}

/**
 * Calculate average XP per day (calendar days, not just days with activities)
 */
export function calculateAvgXPPerDay(activities: Activity[]): number {
  if (activities.length === 0) return 0;
  
  const totalXP = calculateTotalXP(activities);
  
  const dates = activities.map(activity => new Date(activity.completed).getTime());
  const firstDate = new Date(Math.min(...dates));
  const lastDate = new Date(Math.max(...dates));
  
  // Set to start of day for accurate day counting
  firstDate.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);
  
  // Calculate number of calendar days
  const daysDiff = Math.floor((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  
  return daysDiff > 0 ? Math.round(totalXP / daysDiff) : 0;
}

/**
 * Calculate XP attainment rate (percentage of possible XP achieved)
 */
export function calculateXPAttainment(activities: Activity[]): number {
  let totalEarned = 0;
  let totalPossible = 0;
  
  activities.forEach(activity => {
    if (isDiagnostic(activity)) {
      // For diagnostics, use earned as both earned and possible (100% attainment)
      totalEarned += activity.pointsAwarded || 0;
      totalPossible += activity.pointsAwarded || 0;
    } else {
      totalEarned += activity.pointsAwarded || 0;
      totalPossible += activity.points || 10;
    }
  });
  
  return totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 1000) / 10 : 0;
}

/**
 * Calculate activity type counts
 */
export function calculateActivityCounts(activities: Activity[]): ActivityCounts {
  const counts: ActivityCounts = {
    diagnostics: 0,
    lessons: 0,
    reviews: 0,
    multisteps: 0,
    quizzes: 0,
  };

  activities.forEach(activity => {
    const type = activity.type.toLowerCase();
    
    // Check if it's a quiz by name first
    if (isQuiz(activity)) {
      counts.quizzes++;
    } else {
      switch (type) {
        case 'diagnostic':
        case 'assessment':
        case 'supplemental diagnostic':
        case 'placement':
        case 'supplemental':
          counts.diagnostics++;
          break;
        case 'lesson':
          counts.lessons++;
          break;
        case 'review':
          counts.reviews++;
          break;
        case 'multistep':
          counts.multisteps++;
          break;
        case 'quiz':
          counts.quizzes++;
          break;
        default:
          // Unknown activity type - skip
          break;
      }
    }
  });

  return counts;
}

/**
 * Get current course from most recent activity
 */
export function getCurrentCourse(activities: Activity[]): string {
  if (activities.length === 0) return 'No Activities';
  
  const sortedActivities = [...activities].sort((a, b) => 
    new Date(b.completed).getTime() - new Date(a.completed).getTime()
  );
  
  return sortedActivities[0]?.test?.course?.name || 'Unknown Course';
}

/**
 * Course transition point
 */
export interface CourseTransition {
  timestamp: number; // Unix timestamp in seconds
  fromCourse: string;
  toCourse: string;
  label: string; // e.g., "MFII → MFIII"
}

/**
 * Detect course transitions in activities
 */
export function getCourseTransitions(activities: Activity[]): CourseTransition[] {
  if (activities.length === 0) return [];
  
  const sortedActivities = [...activities].sort((a, b) => 
    new Date(a.completed).getTime() - new Date(b.completed).getTime()
  );
  
  const transitions: CourseTransition[] = [];
  let currentCourse = sortedActivities[0]?.test?.course?.name || 'Unknown';
  
  for (let i = 1; i < sortedActivities.length; i++) {
    const activity = sortedActivities[i];
    const courseName = activity.test?.course?.name || 'Unknown';
    
    if (courseName !== currentCourse && courseName !== 'Unknown' && currentCourse !== 'Unknown') {
      const timestamp = new Date(activity.completed).getTime() / 1000;
      transitions.push({
        timestamp,
        fromCourse: currentCourse,
        toCourse: courseName,
        label: `${currentCourse} → ${courseName}`,
      });
      currentCourse = courseName;
    } else if (courseName !== 'Unknown') {
      currentCourse = courseName;
    }
  }
  
  return transitions;
}

