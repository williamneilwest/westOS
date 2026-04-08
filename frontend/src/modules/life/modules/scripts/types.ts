export interface ScriptRecord {
  id: string;
  name: string;
  description: string;
  script: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ScriptPayload {
  name: string;
  description: string;
  script: string;
}
