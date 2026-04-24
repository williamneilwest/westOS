import { useEffect, useMemo, useState } from 'react';
import { Barcode, QrCode, Upload } from 'lucide-react';
import { createWorkCode, getWorkCodes, uploadWorkCodes } from '../../app/services/api';
import { Card, CardHeader } from '../../app/ui/Card';
import { EmptyState } from '../../app/ui/EmptyState';
import { SectionHeader } from '../../app/ui/SectionHeader';

function toText(value) {
  return String(value || '').trim();
}

function formatTimestamp(value) {
  if (!value) {
    return 'Unknown';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleString();
}

function isHttpUrl(value) {
  const text = toText(value).toLowerCase();
  return text.startsWith('http://') || text.startsWith('https://');
}

export function CodesPage() {
  const [items, setItems] = useState([]);
  const [searchName, setSearchName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    type: 'qr',
    label: '',
    text: '',
  });
  const [uploadForm, setUploadForm] = useState({
    type: 'qr',
    file: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  async function loadCodes(query = '') {
    setLoading(true);
    setError('');
    try {
      const payload = await getWorkCodes({ query });
      const nextItems = Array.isArray(payload?.items) ? payload.items : [];
      setItems(nextItems);
    } catch (requestError) {
      setError(requestError.message || 'Failed to load codes.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCodes();
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const timer = setTimeout(() => {
      if (isCancelled) {
        return;
      }
      void loadCodes(searchName);
    }, 220);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchName]);

  async function handleCreateCode(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    setSubmitting(true);
    try {
      await createWorkCode(form);
      setMessage('Code created.');
      setForm((current) => ({ ...current, text: '', label: '' }));
      await loadCodes();
    } catch (requestError) {
      setError(requestError.message || 'Failed to create code.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUploadCodes(event) {
    event.preventDefault();
    if (!uploadForm.file) {
      setError('Select a file first.');
      return;
    }
    setMessage('');
    setError('');
    setUploading(true);
    try {
      const payload = await uploadWorkCodes(uploadForm.file, { type: uploadForm.type });
      setMessage(`${Number(payload?.created || 0)} code(s) created from upload.`);
      setUploadForm((current) => ({ ...current, file: null }));
      await loadCodes();
    } catch (requestError) {
      setError(requestError.message || 'Failed to create codes from upload.');
    } finally {
      setUploading(false);
    }
  }

  const summary = useMemo(() => {
    const total = items.length;
    const qr = items.filter((item) => toText(item.type).toLowerCase() === 'qr').length;
    const barcode = items.filter((item) => toText(item.type).toLowerCase() === 'barcode').length;
    return { total, qr, barcode };
  }, [items]);

  return (
    <section className="module">
      <SectionHeader
        tag="/app/work/codes"
        title="Codes"
        description="Create, store, and view QR and bar codes from text or uploaded files."
      />

      <div className="system-stats">
        <Card className="system-card">
          <CardHeader title="Total" />
          <strong>{summary.total}</strong>
        </Card>
        <Card className="system-card">
          <CardHeader title="QR Codes" />
          <strong>{summary.qr}</strong>
        </Card>
        <Card className="system-card">
          <CardHeader title="Barcodes" />
          <strong>{summary.barcode}</strong>
        </Card>
      </div>

      <Card>
        <CardHeader title="Search QR Codes" description="Search by code name/label." />
        <label className="settings-field">
          <span>Name</span>
          <input
            type="text"
            value={searchName}
            onChange={(event) => setSearchName(event.target.value)}
            placeholder="Search QR code name"
          />
        </label>
      </Card>

      <Card>
        <CardHeader title="Create from Text" />
        <form className="settings-form profile-tight-form" onSubmit={handleCreateCode}>
          <label className="settings-field">
            <span>Type</span>
            <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
              <option value="qr">QR Code</option>
              <option value="barcode">Barcode (Code128)</option>
            </select>
          </label>
          <label className="settings-field">
            <span>Label (optional)</span>
            <input
              type="text"
              value={form.label}
              onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
              placeholder="AdventHealth Intranet"
            />
          </label>
          <label className="settings-field">
            <span>Text / URL</span>
            <textarea
              value={form.text}
              onChange={(event) => setForm((current) => ({ ...current, text: event.target.value }))}
              placeholder="https://intranet.adventhealth.com"
              required
            />
          </label>
          <div className="table-actions">
            <button className="ui-button ui-button--primary" type="submit" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Code'}
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title="Create from Upload" description="Upload TXT or CSV. For CSV, each non-empty cell becomes a code." />
        <form className="settings-form profile-tight-form" onSubmit={handleUploadCodes}>
          <label className="settings-field">
            <span>Type</span>
            <select value={uploadForm.type} onChange={(event) => setUploadForm((current) => ({ ...current, type: event.target.value }))}>
              <option value="qr">QR Code</option>
              <option value="barcode">Barcode (Code128)</option>
            </select>
          </label>
          <label className="settings-field">
            <span>File</span>
            <input
              type="file"
              accept=".txt,.csv,text/plain,text/csv"
              onChange={(event) => setUploadForm((current) => ({ ...current, file: event.target.files?.[0] || null }))}
            />
          </label>
          <div className="table-actions">
            <button className="compact-toggle" type="submit" disabled={uploading}>
              <Upload size={14} />
              {uploading ? 'Uploading...' : 'Create from Upload'}
            </button>
          </div>
        </form>
      </Card>

      {message ? <p className="status-text">{message}</p> : null}
      {error ? <p className="status-text status-text--error">{error}</p> : null}
      {loading ? <p className="status-text">Loading codes...</p> : null}

      {!loading && !items.length ? (
        <EmptyState title="No codes yet" description="Create your first QR or barcode above." />
      ) : null}

      {!loading && items.length ? (
        <div className="work-domain-grid">
          {items.map((item) => {
            const id = toText(item.id);
            const imageUrl = toText(item.image_url);
            const label = toText(item.label) || toText(item.text) || 'Untitled';
            const codeType = toText(item.type).toLowerCase();
            const isQr = codeType === 'qr';
            const icon = isQr ? <QrCode size={14} /> : <Barcode size={14} />;
            const target = toText(item.text);

            return (
              <Card key={id} className="work-domain-card">
                <div className="work-domain-card__head">
                  <span className="work-domain-card__icon">{icon}</span>
                  <div>
                    <h3>{label}</h3>
                    <p>{isQr ? 'QR Code' : 'Barcode (Code128)'}</p>
                  </div>
                </div>
                <div className="codes-image-wrap">
                  <img src={imageUrl} alt={label} className="codes-image" />
                </div>
                <small className="codes-text" title={target}>{target}</small>
                <div className="table-actions">
                  {isHttpUrl(target) ? (
                    <a className="compact-toggle" href={target} target="_blank" rel="noreferrer">
                      Open Target
                    </a>
                  ) : null}
                  <small>{formatTimestamp(item.created_at)}</small>
                </div>
              </Card>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

export default CodesPage;
