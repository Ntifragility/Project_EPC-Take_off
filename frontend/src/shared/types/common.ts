export type SectionType = 'pat' | 'canalizado' | 'bductos';
export type TabType = 'takeoff' | 'rules' | 'packages';
export type AddModeType = 'rule' | 'custom';
export type ThemeType = 'dark' | 'light';
export type AreaType = 'AREA SECA' | 'AREA HUMEDA';

export interface ToastState {
  message: string;
  type?: 'info' | 'warn' | 'success';
}
