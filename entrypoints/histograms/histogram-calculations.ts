import type { Activity } from '@/types/mathacademy';

export interface HistogramData {
  courseName: string;
  lessons: { bins: number[]; counts: number[] };
  reviews: { bins: number[]; counts: number[] };
}

const BUCKET_SIZE = 0.25;
const MIN_XP = 0;
const MAX_XP = 8;

function calculateXPPerMin(activity: Activity): number {
  const startedDate = new Date(activity.started);
  const completedDate = new Date(activity.completed);

  // Duration in minutes (converting from milliseconds)
  const durationMinutes = (completedDate.getTime() - startedDate.getTime()) / (1000 * 60);

  if (durationMinutes <= 0) return 0;

  return activity.pointsAwarded / durationMinutes;
}

function createHistogramBuckets(xpPerMinValues: number[]): { bins: number[]; counts: number[] } {
  // Create bins from MIN_XP to MAX_XP with BUCKET_SIZE increments
  const numBuckets = Math.ceil((MAX_XP - MIN_XP) / BUCKET_SIZE);
  const bins: number[] = [];
  const counts: number[] = new Array(numBuckets).fill(0);

  for (let i = 0; i < numBuckets; i++) {
    bins.push(MIN_XP + i * BUCKET_SIZE);
  }

  // Count values in each bucket
  xpPerMinValues.forEach(xpPerMin => {
    if (xpPerMin < MIN_XP || xpPerMin > MAX_XP) return;

    const bucketIndex = Math.min(
      Math.floor((xpPerMin - MIN_XP) / BUCKET_SIZE),
      numBuckets - 1
    );

    counts[bucketIndex]++;
  });

  return { bins, counts };
}

export function calculateHistograms(activities: Activity[]): HistogramData[] {
  // Group activities by course
  const courseMap = new Map<string, { lessons: Activity[]; reviews: Activity[] }>();

  activities.forEach(activity => {
    const courseName = activity.test.course.name;
    const activityType = activity.type;

    if (!courseName || (activityType !== 'Lesson' && activityType !== 'Review')) return;

    if (!courseMap.has(courseName)) {
      courseMap.set(courseName, { lessons: [], reviews: [] });
    }

    const courseData = courseMap.get(courseName)!;
    if (activityType === 'Lesson') {
      courseData.lessons.push(activity);
    } else {
      courseData.reviews.push(activity);
    }
  });

  // Calculate histograms for each course
  const histograms: HistogramData[] = [];

  courseMap.forEach((courseData, courseName) => {
    const lessonXPPerMin = courseData.lessons.map(calculateXPPerMin);
    const reviewXPPerMin = courseData.reviews.map(calculateXPPerMin);

    histograms.push({
      courseName,
      lessons: createHistogramBuckets(lessonXPPerMin),
      reviews: createHistogramBuckets(reviewXPPerMin),
    });
  });

  // Sort by course name
  histograms.sort((a, b) => a.courseName.localeCompare(b.courseName));

  return histograms;
}
