import type { Activity } from '@/types/mathacademy';

export type ActivityCategory = 'lesson' | 'review' | 'multistep' | 'quiz' | 'diagnostic' | 'other';

/**
 * Classify an activity into a display category.
 *
 * Quizzes are detected by test name first: Math Academy labels some quiz
 * activities with a non-quiz `type`, but their test name always says "quiz".
 * Diagnostics group together every assessment-like type because none of them
 * have a fixed base point value.
 */
export function classifyActivity(activity: Activity): ActivityCategory {
  if ((activity.test?.name ?? '').toLowerCase().includes('quiz')) {
    return 'quiz';
  }

  switch (activity.type.toLowerCase()) {
    case 'lesson':
      return 'lesson';
    case 'review':
      return 'review';
    case 'multistep':
      return 'multistep';
    case 'quiz':
      return 'quiz';
    case 'diagnostic':
    case 'assessment':
    case 'supplemental diagnostic':
    case 'placement':
    case 'supplemental':
      return 'diagnostic';
    default:
      return 'other';
  }
}

export function isDiagnostic(activity: Activity): boolean {
  return classifyActivity(activity) === 'diagnostic';
}
