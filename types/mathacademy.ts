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

export interface Unit {
  id: number;
  number: number;
  name: string;
}

export interface Module {
  id: number;
  number: number;
  name: string;
}

export interface KnowledgeGraphTopic {
  id: number;
  name: string;
  depth: number | null;
  numAncestors: number | null;
  live: number;
  unit: Unit;
  module: Module;
  course: Course;
  prerequisites: number[];
  frontier: number | boolean;
  repetition: number;
  halfLife: number;
}

export interface KnowledgeGraphResponse {
  result: boolean;
  topics: Record<string, KnowledgeGraphTopic>;
}

export interface FrontierTopic {
  id: number;
  name: string;
  prerequisites?: number[];
  frontier?: number | boolean | string;
  repetitions?: number;
  repetition?: number;
}

export interface FrontierTopicStats {
  min: number | null;
  max: number | null;
  median: number | null;
  mean: number | null;
  halfLifeMin: number | null;
  halfLifeMax: number | null;
  halfLifeMedian: number | null;
  halfLifeMean: number | null;
}

export interface EnrichedFrontierTopic {
  topic: KnowledgeGraphTopic | FrontierTopic;
  prereqIds: number[];
  prereqTopics: (KnowledgeGraphTopic | FrontierTopic | null)[];
  repVals: number[];
  halfLifeVals: number[];
  stats: FrontierTopicStats;
  sortKey: number;
}

