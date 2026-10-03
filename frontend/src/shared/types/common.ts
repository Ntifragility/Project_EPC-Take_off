export type SectionType = 'pat' | 'canalizado';
export type TabType = 'takeoff' | 'rules' | 'packages' | 'bductos';
export type AddModeType = 'rule' | 'custom';
export type ThemeType = 'dark' | 'light';
export type AreaType = 'AREA SECA' | 'AREA HUMEDA';

export interface ToastState {
  message: string;
  type?: 'info' | 'warn' | 'success';
}
