export interface ChangedFile {
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previous_filename?: string;
}

export interface ReviewComment {
  path: string;
  line: number;
  body: string;
}

export interface CodeAnalysis {
  summary: string;
  comments: ReviewComment[];
}

export interface GeminiAnalysisResponse {
  summary: string;
  issuesFound: number;
  comments: ReviewComment[];
}

export interface ActionInputs {
  geminiApiKey: string;
  githubToken: string;
  geminiModel?: string;
  maxChanges?: number;
  maxComments?: number;
}

