export type SitePromptKind = 'confirm' | 'prompt' | 'alert';

export interface SitePromptLine {
  text: string;
  strong?: boolean;
}

export interface SitePromptRequest {
  id: number;
  kind: SitePromptKind;
  message: string;
  defaultValue: string;
  lines?: SitePromptLine[];
  onDownload?: () => void | Promise<void>;
}

type Resolver = (value: boolean | string | null) => void;

interface Pending extends SitePromptRequest {
  resolve: Resolver;
}

let sequence = 0;
let current: Pending | null = null;
const waiting: Pending[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(listener => listener());
}

function show(next: Pending) {
  if (current) waiting.push(next);
  else {
    current = next;
    emit();
  }
}

export function settleSitePrompt(value: boolean | string | null) {
  const pending = current;
  if (!pending) return;
  pending.resolve(value);
  current = waiting.shift() ?? null;
  emit();
}

export function subscribeSitePrompt(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSitePrompt(): SitePromptRequest | null {
  return current;
}

export function siteConfirm(message: string): Promise<boolean> {
  return new Promise(resolve => {
    show({
      id: ++sequence,
      kind: 'confirm',
      message,
      defaultValue: '',
      resolve: value => resolve(value === true)
    });
  });
}

export function sitePrompt(message: string, defaultValue = ''): Promise<string | null> {
  return new Promise(resolve => {
    show({
      id: ++sequence,
      kind: 'prompt',
      message,
      defaultValue,
      resolve: value => resolve(typeof value === 'string' ? value : null)
    });
  });
}

export function siteAlert(message: string): Promise<void> {
  return new Promise(resolve => {
    show({
      id: ++sequence,
      kind: 'alert',
      message,
      defaultValue: '',
      resolve: () => resolve()
    });
  });
}

export function siteGuide(lines: SitePromptLine[], onDownload: () => void | Promise<void>): Promise<void> {
  return new Promise(resolve => {
    show({
      id: ++sequence,
      kind: 'alert',
      message: lines.map(line => line.text).join('\n'),
      defaultValue: '',
      lines,
      onDownload,
      resolve: () => resolve()
    });
  });
}
