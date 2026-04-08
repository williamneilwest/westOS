import { Plus } from 'lucide-react';
import { Button, Card } from '../../../components/ui';
import { AddQuickLinkModal } from './AddQuickLinkModal';
import { QuickLinkCard } from './QuickLinkCard';
import { useState } from 'react';
import type { QuickLink } from '../types';

interface QuickLinksPanelProps {
  links: QuickLink[];
  pinnedLinkIds: string[];
  addError: string | null;
  addSubmitting: boolean;
  onTogglePin: (linkId: string) => void;
  onAddLink: (payload: { title?: string; url: string; category?: string }) => Promise<void>;
  onDeleteLink: (linkId: number) => void;
}

export function QuickLinksPanel({
  links,
  pinnedLinkIds,
  addError,
  addSubmitting,
  onTogglePin,
  onAddLink,
  onDeleteLink,
}: QuickLinksPanelProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <>
      <Card title="Quick Links" description="Pinned enterprise tools and portals.">
        <div className="mb-3 flex justify-end">
          <Button variant="outline" onClick={() => setShowAddModal(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Link
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {links.map((link) => {
            const pinned = pinnedLinkIds.includes(String(link.id));
            return (
              <QuickLinkCard
                key={link.id}
                link={link}
                pinned={pinned}
                onTogglePin={onTogglePin}
                onDelete={onDeleteLink}
              />
            );
          })}
          {links.length === 0 ? <p className="text-sm text-slate-500">No quick links saved yet.</p> : null}
        </div>
      </Card>

      <AddQuickLinkModal
        open={showAddModal}
        error={addError}
        submitting={addSubmitting}
        onClose={() => setShowAddModal(false)}
        onSubmit={async (payload) => {
          await onAddLink(payload);
          setShowAddModal(false);
        }}
      />
    </>
  );
}
