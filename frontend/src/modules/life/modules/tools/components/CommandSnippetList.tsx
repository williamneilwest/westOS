import { useState } from 'react';
import { Badge, Button, Card } from '../../../components/ui';
import type { CommandSnippet } from '../types';

interface CommandSnippetListProps {
  snippets: CommandSnippet[];
}

export function CommandSnippetList({ snippets }: CommandSnippetListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyCommand(id: string, command: string) {
    await navigator.clipboard.writeText(command);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1000);
  }

  return (
    <Card>
      <h3 className="text-lg font-semibold text-white">Command Snippets</h3>
      <div className="mt-4 space-y-3">
        {snippets.map((snippet) => (
          <div key={snippet.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-white">{snippet.title}</p>
              <code className="text-xs text-slate-300">{snippet.command}</code>
            </div>
            <div className="flex items-center gap-2">
              {copiedId === snippet.id ? <Badge variant="success">Copied</Badge> : null}
              <Button variant="outline" onClick={() => void copyCommand(snippet.id, snippet.command)}>
                Copy
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
