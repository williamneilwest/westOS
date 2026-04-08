import { useEffect, useState } from 'react';
import { Button, Modal } from '../../../components/ui';
import type { ScriptPayload, ScriptRecord } from '../types';

interface ScriptModalProps {
  open: boolean;
  mode: 'add' | 'edit';
  initialScript?: ScriptRecord | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (payload: ScriptPayload) => void;
}

export function ScriptModal({ open, mode, initialScript, submitting, onClose, onSubmit }: ScriptModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [script, setScript] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initialScript?.name || '');
    setDescription(initialScript?.description || '');
    setScript(initialScript?.script || '');
    setError(null);
  }, [open, initialScript]);

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!script.trim()) {
      setError('Script is required');
      return;
    }
    setError(null);
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      script,
    });
  };

  return (
    <Modal title={mode === 'add' ? 'Add Script' : 'Edit Script'} open={open} onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-xs uppercase tracking-wide text-slate-400">
          Name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/40"
            placeholder="Wipe User Profile"
          />
        </label>
        <label className="block text-xs uppercase tracking-wide text-slate-400">
          Description
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/40"
            placeholder="What this script does"
          />
        </label>
        <label className="block text-xs uppercase tracking-wide text-slate-400">
          Script
          <textarea
            value={script}
            onChange={(event) => setScript(event.target.value)}
            className="mt-1 h-64 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 font-mono text-xs text-white outline-none transition focus:border-cyan-300/40"
            placeholder="Paste PowerShell script here..."
          />
        </label>

        {error ? (
          <p className="rounded-lg border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : mode === 'add' ? 'Add Script' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
