import { X } from 'lucide-react';

function getItemTitle(item) {
  return String(item?.id || item?.number || item?.ticket || item?.title || 'Ticket').trim();
}

function getItemDescription(item) {
  const title = getItemTitle(item);
  const description = String(item?.title || item?.description || item?.summary || '').trim();
  return description && description !== title ? description : '';
}

export function DataModal({ open, title, items = [], onClose }) {
  if (!open) {
    return null;
  }

  const rows = Array.isArray(items) ? items : [];

  return (
    <div className="data-modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-modal="true"
        aria-label={title || 'Details'}
        className="data-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="data-modal__header">
          <div>
            <span className="ui-eyebrow">{`${rows.length.toLocaleString()} result${rows.length === 1 ? '' : 's'}`}</span>
            <h3>{title || 'Details'}</h3>
          </div>
          <button className="compact-toggle compact-toggle--icon" onClick={onClose} type="button" aria-label="Close details">
            <X size={15} />
          </button>
        </header>

        <div className="data-modal__body">
          {rows.length ? (
            rows.map((item, index) => {
              const itemTitle = getItemTitle(item);
              const description = getItemDescription(item);
              return (
                <article className="data-modal__item" key={`${itemTitle}-${index}`}>
                  <div className="data-modal__item-main">
                    <strong>{itemTitle}</strong>
                    {description ? <p>{description}</p> : null}
                  </div>
                  <div className="data-modal__item-meta">
                    {item?.state ? <span>{item.state}</span> : null}
                    {item?.assignee ? <span>{item.assignee}</span> : null}
                    {item?.openedAt ? <span>{item.openedAt}</span> : null}
                    {item?.priority ? <span>{item.priority}</span> : null}
                    {item?.type ? <span>{String(item.type).toUpperCase()}</span> : null}
                  </div>
                </article>
              );
            })
          ) : (
            <p className="data-modal__empty">No matching records are available.</p>
          )}
        </div>
      </section>
    </div>
  );
}
