export type SectionType = 'pat' | 'canalizado' | 'bductos';
export type TabType = 'takeoff' | 'rules' | 'packages' | 'curves';
export type AddModeType = 'rule' | 'custom';
export type ThemeType = 'dark' | 'light';
export type AreaType = 'AREA SECA' | 'AREA HUMEDA';
export type SubAreaHumeda = 'CORROSIVO' | 'NO_CORROSIVO';

export interface ToastState {
  message: string;
  type?: 'info' | 'warn' | 'success';
}
