export type TaskStatus = 'Done' | 'Undone';

export type UserRole = 'Administrator' | 'Editor' | 'Author' | 'Custom';
export type TwoFactorStatus = 'Enabled' | 'Disabled' | 'Not Verified';

export interface WordPressUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  twoFactorStatus: TwoFactorStatus;
  notes?: string;
}

export interface QaChecklist {
  accessibility: boolean;
  navigation: boolean;
  forms: boolean;
  responsive: boolean;
  performance: boolean;
  criticalFunctions: boolean;
}

export interface TaskMeta {
  phpVersion?: string;
  wpVersion?: string;
  configChanges?: string;
  qaChecks?: QaChecklist;
}

export interface MaintenanceTask {
  id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  notes?: string;
  isCustom: boolean;
  orderIndex: number;
  meta?: TaskMeta;
}

export interface WebsiteReport {
  id: string;
  websiteUrl: string;
  websiteName: string;
  clientName?: string;
  reportDate: string; // YYYY-MM-DD
  preparedBy?: string;
  totalTasks: number;
  completedTasks: number;
  incompleteTasks: number;
  completionPercentage: number;
  tasks: MaintenanceTask[];
  wordpressUsers: WordPressUser[];
  executiveSummary: string;
  finalSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor';
}
