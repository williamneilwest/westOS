import { useEffect, useMemo, useState } from 'react';
import { Button, Modal } from '../../../components/ui';
import type { QuickLink } from '../data/quickLinks';
import { isValidQuickLinkUrl, quickLinkCategories } from '../data/quickLinks';

type QuickLinkModalProps = {
  open: boolean;
  mode: 'add' | 'edit';
  initial?: QuickLink | null;
  onClose: () => void;
  onSubmit: (payload: { name: string; url: string; category: string; icon?: string; description?: string }) => void;
};

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

export function QuickLinkModal({ open, mode, initial, onClose, onSubmit }: QuickLinkModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState(quickLinkCategories[0]);
  const [icon, setIcon] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name || '');
    setUrl(initial?.url || '');
    setCategory(initial?.category || quickLinkCategories[0]);
    setIcon(initial?.icon || '');
    setDescription(initial?.description || '');
    setError(null);
  }, [open, initial]);

  const title = useMemo(() => (mode === 'add' ? 'Add Quick Link' : 'Edit Quick Link'), [mode]);

  return (
    <Modal title={title} open={open} onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-xs uppercase tracking-wide text-slate-400">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/40"
            placeholder="ServiceNow Incidents"
          />
        </label>
        <label className="block text-xs uppercase tracking-wide text-slate-400">
          URL
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/40"
            placeholder="https://..."
          />
        </label>
        <label className="block text-xs uppercase tracking-wide text-slate-400">
          Category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/40"
          >
            {quickLinkCategories.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
        <label className="block text-xs uppercase tracking-wide text-slate-400">
          Icon (optional)
          <input
            value={icon}
            onChange={(event) => setIcon(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/40"
            placeholder="ticket, workflow, bar-chart-3..."
          />
        </label>
        <label className="block text-xs uppercase tracking-wide text-slate-400">
          Description (optional)
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/40"
            rows={2}
            placeholder="What this shortcut is used for..."
          />
        </label>

        {error ? <p className="rounded-lg border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              const normalizedUrl = normalizeUrl(url);
              if (!name.trim()) {
                setError('Name is required');
                return;
              }
              if (!isValidQuickLinkUrl(normalizedUrl)) {
                setError('URL must be a valid http/https link');
                return;
              }
              setError(null);
              onSubmit({
                name: name.trim(),
                url: normalizedUrl,
                category: category.trim(),
                icon: icon.trim() || undefined,
                description: description.trim() || undefined,
              });
            }}
          >
            {mode === 'add' ? 'Add Link' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
