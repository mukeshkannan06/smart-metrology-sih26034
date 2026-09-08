export type UserRole = 'INSPECTOR' | 'ASSISTANT_CONTROLLER' | 'inspector' | 'assistant_controller';

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: 'INSPECTOR' | 'ASSISTANT_CONTROLLER';
  inspectorId?: string;
  roleTitle: string;
  designation: string;
  badgeNumber: string;
  department: string;
  isDemo?: boolean;
}

export interface NavItem {
  name: string;
  path: string;
  iconName: string;
  badge?: string;
  badgeColor?: 'blue' | 'amber' | 'emerald' | 'rose';
}

