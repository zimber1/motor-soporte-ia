export type Category = 'ACCESS' | 'BUG' | 'FEATURE' | 'SECURITY';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Mode = 'traditional' | 'generative';

export interface AnalyzeResponse {
  category: Category;
  priority: Priority;
  response: string;
  requiresHumanReview: boolean;
  mode: Mode;
}
