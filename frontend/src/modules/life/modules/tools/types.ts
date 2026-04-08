export interface ToolLink {
  id: string;
  name: string;
  url: string;
  category: string;
}

export interface CommandSnippet {
  id: string;
  title: string;
  command: string;
}

export interface ToolsOverview {
  links: number;
  snippets: number;
}

export type ToolModuleType = 'services' | 'qr' | 'shortcut' | 'api' | 'api_tester';

export interface QrHistoryEntry {
  id: string;
  text: string;
  createdAt: string;
}

export interface QrModuleConfig {
  defaultText?: string;
  history?: QrHistoryEntry[];
}

export interface ShortcutModuleConfig {
  label: string;
  url: string;
  newTab?: boolean;
  method?: 'GET' | 'POST';
}

export interface ApiModuleConfig {
  endpoint: string;
  method?: 'GET' | 'POST';
  refreshInterval?: number;
  display?: 'table' | 'card' | 'raw';
}

export interface ToolModule {
  id: string;
  name: string;
  type: ToolModuleType;
  config: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}
