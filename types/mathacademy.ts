export interface Course {
  id: number | null;
  name: string | null;
}

export interface Prerequisite {
  id: number;
  name: string;
  urlSlug: string;
}

export interface Topic {
  id: number | null;
  name: string | null;
  prerequisites?: Prerequisite[];
  course: Course;
}

export interface Test {
  id: number | null;
  name: string | null;
  timeLimit: number | null;
  questionCount: number | null;
  course: Course;
}

export interface MultistepType {
  id: number;
  name: string;
}

export interface Multistep {
  id: number;
  type: MultistepType;
}

export interface Activity {
  id: number;
  type: string;
  topicCourseId: number | null;
  locked: number | null;
  importance: number;
  reason: string | null;
  progress: number;
  points: number;
  pointsAwarded: number;
  mp: number | null;
  mpAwarded: number | null;
  mpDecayRate: number | null;
  topic: Topic;
  started: string;
  completed: string;
  timeCompletedStr: string;
  dateCompletedStr: string;
  test: Test;
  multistep?: Multistep;
  progressStr: string;
}

export interface CourseStats {
  courseName: string;
  percentile25: number;
  percentile50: number;
  percentile75: number;
  percentAboveOne: number;
  activityCount: number;
  thresholdPercentages: {
    [threshold: number]: number;
  };
}

export interface FrontierTopic {
  id: number;
  name: string;
  prerequisites?: number[];
  frontier?: number | boolean | string;
  repetitions?: number;
  repetition?: number;
}

export interface KnowledgeGraphResponse {
  topics: Record<string, FrontierTopic>;
}

export interface FrontierTopicStats {
  min: number | null;
  max: number | null;
  median: number | null;
  mean: number | null;
}

export interface EnrichedFrontierTopic {
  topic: FrontierTopic;
  prereqIds: number[];
  prereqTopics: (FrontierTopic | null)[];
  repVals: number[];
  stats: FrontierTopicStats;
  sortKey: number;
}

