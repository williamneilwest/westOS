import { useEffect, useState } from 'react';
import { BrainCircuit, FileJson, X } from 'lucide-react';
import { getProcessedKnowledgeBase, getProcessedKnowledgeBaseDocument } from '../../app/services/api';
import { Card, CardHeader } from '../../app/ui/Card';
import { EmptyState } from '../../app/ui/EmptyState';
import { formatDataFileName } from '../../app/utils/fileDisplay';

function formatWhen(value) {
  if (!value) {
    return 'Time unavailable';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Time unavailable';
  }

  return parsed.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ProcessedKBPage() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedPayload, setSelectedPayload] = useState(null);
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    let mounted = true;

    getProcessedKnowledgeBase()
      .then((payload) => {
        if (mounted) {
          setItems(Array.isArray(payload) ? payload : []);
        }
      })
      .catch((requestError) => {
        if (mounted) {
          setError(requestError.message || 'Processed KB documents could not be loaded.');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function handleOpen(item) {
    setSelectedItem(item);
    setSelectedPayload(null);
    setDetailError('');

    try {
      const payload = await getProcessedKnowledgeBaseDocument(item.filename);
      setSelectedPayload(payload && typeof payload === 'object' ? payload : {});
    } catch (requestError) {
      setDetailError(requestError.message || 'Processed KB document could not be loaded.');
    }
  }

  return (
    <section className="module">
      <Card className="analysis-grid__wide">
        <CardHeader
          eyebrow="Processed KB"
          title="AI parsed knowledge documents"
          description="Structured results generated from uploaded KB documents."
        />

        {error ? <p className="status-text status-text--error">{error}</p> : null}

        {items.length ? (
          <div className="stack-list">
            {items.map((item) => (
              <button
                key={item.filename}
                className="stack-row stack-row--interactive"
                onClick={() => void handleOpen(item)}
                type="button"
              >
                <span className="stack-row__label">
                  <BrainCircuit size={16} />
                  <span>
                    <strong>{item.title || formatDataFileName(item.filename)}</strong>
                    <small>{formatDataFileName(item.filename)} · {formatWhen(item.modifiedAt)}</small>
                    <small>{item.summary || 'No summary available yet.'}</small>
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileJson size={20} />}
            title="No processed KB documents yet"
            description="Uploaded KB documents will appear here after background parsing finishes."
          />
        )}
      </Card>

      {selectedItem ? (
        <div className="row-detail-backdrop" onClick={() => setSelectedItem(null)} role="presentation">
          <aside aria-label="Processed KB details" className="row-detail-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="row-detail-drawer__header">
              <div className="row-detail-drawer__title">
                <span className="ui-eyebrow">Processed KB</span>
                <h3>{selectedItem.title || formatDataFileName(selectedItem.filename)}</h3>
                <p>{formatDataFileName(selectedItem.filename)}</p>
              </div>
              <button className="compact-toggle compact-toggle--icon" onClick={() => setSelectedItem(null)} type="button">
                <X size={15} />
              </button>
            </div>

            <div className="row-detail-drawer__content">
              {detailError ? <p className="status-text status-text--error">{detailError}</p> : null}
              <pre className="code-block">{JSON.stringify(selectedPayload || {}, null, 2)}</pre>
            </div>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
