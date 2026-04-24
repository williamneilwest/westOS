import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { getAnalyzedDocument } from '../../app/services/api';
import { Card, CardHeader } from '../../app/ui/Card';
import { SectionHeader } from '../../app/ui/SectionHeader';
import { formatDataFileName } from '../../app/utils/fileDisplay';
import { canPreviewInline, isImageFile, isPdfFile, isTextLikeFile } from '../../app/utils/documentFiles';

function getDisplayPayload(doc) {
  if (!doc || typeof doc !== 'object') {
    return {};
  }

  const structured = doc.ai_structured;
  if (structured && typeof structured === 'object' && Object.keys(structured).length > 0) {
    return structured;
  }

  return {
    summary: doc.ai_summary || 'No structured AI output available.',
    tags: Array.isArray(doc.tags) ? doc.tags : [],
    source: doc.source || '',
    file_type: doc.file_type || '',
    parsed_text_preview: String(doc.parsed_text || '').slice(0, 1000),
  };
}

function getDisplayBody(doc) {
  const raw = doc?.ai_structured?.raw_response;
  if (typeof raw === 'string' && raw.trim()) {
    return raw;
  }
  return JSON.stringify(getDisplayPayload(doc), null, 2);
}

function absoluteUrl(relative) {
  try {
    return new URL(relative, window.location.origin).toString();
  } catch {
    return relative;
  }
}

function getSourceUrl(doc) {
  const source = String(doc?.source || '').toLowerCase();
  const filename = String(doc?.filename || '');
  const originalPath = String(doc?.original_path || '').replace(/\\/g, '/');

  const kbMatch = originalPath.match(/\/kb\/([^/]+)\/([^/]+)$/i);
  if (kbMatch) {
    return `/kb/${encodeURIComponent(kbMatch[1])}/${encodeURIComponent(kbMatch[2])}`;
  }

  if (source === 'uploads' && filename) {
    return `/uploads/${encodeURIComponent(filename)}`;
  }

  return '';
}

function renderPreview(url, fileName, mimeType) {
  if (isImageFile(fileName, mimeType)) {
    return <img alt={formatDataFileName(fileName) || 'Document preview'} className="document-view__image" src={url} />;
  }

  if (isPdfFile(fileName, mimeType) || isTextLikeFile(fileName, mimeType)) {
    return <iframe className="document-view__frame" src={url} title={formatDataFileName(fileName) || 'Document preview'} />;
  }

  return null;
}

export function DocumentDetailPage() {
  const { id } = useParams();
  const [error, setError] = useState('');
  const [doc, setDoc] = useState(null);

  useEffect(() => {
    let mounted = true;
    if (!id) return undefined;
    getAnalyzedDocument(id)
      .then((payload) => {
        if (mounted) setDoc(payload && typeof payload === 'object' ? payload : null);
      })
      .catch((e) => {
        if (mounted) setError(e?.message || 'Document could not be loaded');
      });
    return () => { mounted = false; };
  }, [id]);

  const sourceUrl = getSourceUrl(doc);
  const previewUrl = sourceUrl ? absoluteUrl(sourceUrl) : '';
  const inlinePreview = sourceUrl && canPreviewInline(doc?.filename || '', doc?.file_type || '');

  return (
    <section className="module">
      <SectionHeader tag="/app/ai/documents" title="AI Documents" description="OpenAI analysis details for a single document." />

      {error ? <p className="status-text status-text--error">{error}</p> : null}

      <Card className="analysis-grid__wide">
        <CardHeader
          eyebrow="Document"
          title={doc ? formatDataFileName(doc.filename) : 'Loading…'}
          description={doc?.ai_summary || 'Structured analysis output'}
        />

        {doc ? (
          <>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '8px 0 16px' }}>
              <Link className="compact-toggle" to="/app/ai/documents">Back to list</Link>
              {Array.isArray(doc.tags) && doc.tags.length ? (
                <span style={{ marginLeft: 8 }}>
                  {doc.tags.map((tag) => (
                    <span key={`${doc.id}-${tag}`} className="badge" style={{ marginRight: 6 }}>{tag}</span>
                  ))}
                </span>
              ) : null}
            </div>

            <pre className="code-block">{getDisplayBody(doc)}</pre>
          </>
        ) : null}
      </Card>

      {doc && sourceUrl ? (
        <Card className="analysis-grid__wide">
          <CardHeader
            eyebrow="Source Document"
            title={formatDataFileName(doc.filename) || 'Document'}
            description={doc.file_type || 'Stored file'}
            action={(
              <a className="compact-toggle" href={previewUrl} rel="noreferrer" target="_blank">
                <ExternalLink size={15} />
                Open Raw
              </a>
            )}
          />
          {inlinePreview ? (
            <div className="document-view">
              {renderPreview(previewUrl, doc.filename || '', doc.file_type || '')}
            </div>
          ) : (
            <p className="status-text">Inline preview unavailable for this file type.</p>
          )}
        </Card>
      ) : null}
    </section>
  );
}

export default function route() {
  return { Component: DocumentDetailPage };
}
