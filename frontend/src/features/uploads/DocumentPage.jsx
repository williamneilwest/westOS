import { ArrowLeft, Download, ExternalLink, FileText } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardHeader } from '../../app/ui/Card';
import { EmptyState } from '../../app/ui/EmptyState';
import { formatDataFileName } from '../../app/utils/fileDisplay';
import { canPreviewInline, isImageFile, isPdfFile, isTextLikeFile } from '../../app/utils/documentFiles';

function absoluteUrl(relative) {
  try {
    return new URL(relative, window.location.origin).toString();
  } catch {
    return relative;
  }
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

export function DocumentPage() {
  const [searchParams] = useSearchParams();
  const fileUrl = searchParams.get('url') || '';
  const fileName = searchParams.get('fileName') || '';
  const mimeType = searchParams.get('mimeType') || '';
  const title = searchParams.get('title') || 'Document';
  const backTo = searchParams.get('backTo') || '/app/uploads';

  if (!fileUrl) {
    return (
      <section className="module">
        <Card className="analysis-grid__wide">
          <EmptyState
            icon={<FileText size={20} />}
            title="No document selected"
            description="Open a file from Uploads or the Knowledge Base to preview it here."
          />
        </Card>
      </section>
    );
  }

  const previewUrl = absoluteUrl(fileUrl);
  const inlinePreview = canPreviewInline(fileName, mimeType);

  return (
    <section className="module">
      <Card className="analysis-grid__wide">
        <CardHeader
          eyebrow={title}
          title={formatDataFileName(fileName) || 'Document preview'}
          description={mimeType || 'Stored file'}
          action={
            <div className="table-actions">
              <a className="compact-toggle" href={previewUrl} rel="noreferrer" target="_blank">
                <ExternalLink size={15} />
                Open Raw
              </a>
              <a className="compact-toggle" download={fileName} href={previewUrl}>
                <Download size={15} />
                Download
              </a>
              <Link className="compact-toggle" to={backTo}>
                <ArrowLeft size={15} />
                Back
              </Link>
            </div>
          }
        />

        {inlinePreview ? (
          <div className="document-view">
            {renderPreview(previewUrl, fileName, mimeType)}
          </div>
        ) : (
          <EmptyState
            icon={<FileText size={20} />}
            title="Preview not available in-browser"
            description="This document type is supported for download and raw open, but the browser may not render it inline."
          />
        )}
      </Card>
    </section>
  );
}
