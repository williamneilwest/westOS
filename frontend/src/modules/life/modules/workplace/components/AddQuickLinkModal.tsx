import { useEffect, useState } from 'react';
import { Button, Modal } from '../../../components/ui';

interface AddQuickLinkModalProps {
  open: boolean;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: { title?: string; url: string; category?: string }) => Promise<void> | void;
}

function extractDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname;
  } catch {
    return '';
  }
}

function isValidHttpUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function AddQuickLinkModal({ open, submitting, error, onClose, onSubmit }: AddQuickLinkModalProps) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setUrl('');
      setCategory('');
      setValidationError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (submitting) {
      return;
    }

    const normalizedUrl = normalizeUrl(url);
    const trimmedTitle = title.trim();
    const trimmedCategory = category.trim();

    if (!normalizedUrl || !isValidHttpUrl(normalizedUrl)) {
      setValidationError('Enter a valid URL (example: google.com or https://google.com)');
      return;
    }

    const fallbackTitle = extractDomain(normalizedUrl);
    const finalTitle = trimmedTitle || fallbackTitle;
    if (!finalTitle) {
      setValidationError('Title is required');
      return;
    }

    setValidationError(null);
    try {
      await onSubmit({
        title: finalTitle,
        url: normalizedUrl,
        category: trimmedCategory || undefined,
      });
    } catch {
      // Parent handles error state; keep modal open.
    }
  };

  return (
    <Modal title="Add Quick Link" open={open} onClose={onClose}>
      <div className="space-y-3">
        <label className="block text-xs uppercase tracking-wide text-slate-400">
          Title
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="If blank, domain will be used"
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/40"
          />
        </label>
        <label className="block text-xs uppercase tracking-wide text-slate-400">
          URL
          <input
            type="text"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com"
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/40"
          />
        </label>
        <label className="block text-xs uppercase tracking-wide text-slate-400">
          Category (Optional)
          <input
            type="text"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Work, Dev, Infra..."
            className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-cyan-300/40"
          />
        </label>

        {(validationError || error) ? (
          <p className="rounded-lg border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {validationError || error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => { void handleSubmit(); }} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Link'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
