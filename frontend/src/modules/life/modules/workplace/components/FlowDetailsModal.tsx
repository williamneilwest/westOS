import { Download } from 'lucide-react';
import { Button, Modal } from '../../../components/ui';
import { flowService } from '../services/flowService';
import type { FlowRunDetails } from '../types';

interface FlowDetailsModalProps {
  open: boolean;
  flow: FlowRunDetails | null;
  loading: boolean;
  onSaveQuickLink: (payload: { title: string; url: string; category?: string }) => Promise<void>;
  onClose: () => void;
}

export function FlowDetailsModal({ open, flow, loading, onSaveQuickLink, onClose }: FlowDetailsModalProps) {
  const headers = flow?.preview?.length ? Object.keys(flow.preview[0] || {}) : [];

  return (
    <Modal title="Flow Details" open={open} onClose={onClose}>
      {loading ? <p className="text-sm text-slate-400">Loading flow details...</p> : null}
      {!loading && !flow ? <p className="text-sm text-slate-400">No flow selected.</p> : null}

      {!loading && flow ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-3 text-xs text-slate-300">
            <p><span className="text-slate-400">File:</span> {flow.file_name}</p>
            <p><span className="text-slate-400">Status:</span> {flow.status}</p>
            <p><span className="text-slate-400">Rows/Cols:</span> {flow.row_count} / {flow.column_count}</p>
            <p><span className="text-slate-400">Processing:</span> {flow.processing_time_ms ?? 'n/a'} ms</p>
            {flow.error_message ? <p className="mt-2 text-rose-300">{flow.error_message}</p> : null}
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Preview (first 10 rows)</p>
            {headers.length === 0 ? (
              <p className="text-xs text-slate-500">No preview available.</p>
            ) : (
              <div className="max-h-56 overflow-auto">
                <table className="min-w-full text-xs text-slate-200">
                  <thead>
                    <tr>
                      {headers.map((header) => (
                        <th key={header} className="border-b border-white/10 px-2 py-1 text-left">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {flow.preview.map((row, idx) => (
                      <tr key={idx}>
                        {headers.map((header) => (
                          <td key={`${idx}-${header}`} className="border-b border-white/5 px-2 py-1">{String(row[header] ?? '')}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!flow) {
                  return;
                }
                void onSaveQuickLink({
                  title: `${flow.file_name} Download`,
                  url: window.location.origin + flowService.downloadUrl(flow.id),
                  category: 'Flows',
                });
              }}
              disabled={flow.status !== 'Success'}
            >
              Save as Quick Link
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open(flowService.downloadUrl(flow.id), '_blank', 'noopener,noreferrer')}
              disabled={flow.status !== 'Success'}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Download Excel
            </Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
