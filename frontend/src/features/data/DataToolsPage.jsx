import { Database, FileUp, Loader2, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { uploadDataFile } from '../../app/services/api';
import { Card } from '../../app/ui/Card';
import { SectionHeader } from '../../app/ui/SectionHeader';
import { FileExplorer } from './FileExplorer';

export function DataToolsPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('');
  const [tools, setTools] = useState([]);
  const [docMetadata, setDocMetadata] = useState(null);
  const rankedTools = useMemo(() => {
    const tags = Array.isArray(docMetadata?.tags) ? docMetadata.tags.map((item) => String(item || '').toLowerCase()) : [];
    if (!tags.length) {
      return tools;
    }

    return [...tools].sort((left, right) => {
      const leftText = `${left?.name || ''} ${left?.label || ''} ${left?.description || ''}`.toLowerCase();
      const rightText = `${right?.name || ''} ${right?.label || ''} ${right?.description || ''}`.toLowerCase();
      const leftScore = tags.reduce((score, tag) => (leftText.includes(tag) ? score + 1 : score), 0);
      const rightScore = tags.reduce((score, tag) => (rightText.includes(tag) ? score + 1 : score), 0);
      return rightScore - leftScore;
    });
  }, [docMetadata?.tags, tools]);

  async function handleUpload(event) {
    event.preventDefault();
    if (!selectedFile) {
      setError('Choose a file before uploading.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const result = await uploadDataFile(selectedFile);
      setFileName(result.fileName || selectedFile.name || 'Unknown file');
      setFileType(result.fileType || 'unknown');
      setTools(Array.isArray(result.suggestedTools) ? result.suggestedTools : []);
      setDocMetadata(result.document && typeof result.document === 'object' ? result.document : null);
      if (result.processingError) {
        setError(String(result.processingError));
      }
    } catch (requestError) {
      setFileName('');
      setFileType('');
      setTools([]);
      setDocMetadata(null);
      setError(requestError.message || 'File upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function runTool(tool) {
    const label = tool?.label || tool?.name || 'Unknown tool';
    // Intentional stub for tool execution until backend processing handlers are added.
    // eslint-disable-next-line no-console
    console.log('[DataTools] tool action', { fileName, fileType, tool });
  }

  return (
    <section className="module module--data-tools">
      <SectionHeader
        tag="/app/data"
        title="Data Tools"
        description="Interact with uploaded data using modular tools."
        actions={(
          <div className="table-actions">
            <Link className="compact-toggle" to="/app/data-sources">
              Open Data Sources
            </Link>
          </div>
        )}
      />

      <div className="data-tools-layout">
        <Card className="data-tools-panel">
          <div className="data-tools-panel__header">
            <span className="icon-badge">
              <FileUp size={16} />
            </span>
            <div>
              <h3>Upload Panel</h3>
              <p>Upload a csv, json, txt, pdf, or docx file to get suggested tools.</p>
            </div>
          </div>

          <form className="data-tools-upload" onSubmit={handleUpload}>
            <input
              accept=".csv,.json,.txt,.text,.md,.log,.pdf,.docx"
              className="data-tools-upload__input"
              onChange={(event) => {
                setSelectedFile(event.target.files?.[0] || null);
                setError('');
              }}
              type="file"
            />
            <button className="ui-button ui-button--primary" disabled={uploading || !selectedFile} type="submit">
              {uploading ? <Loader2 size={16} className="spin" /> : <Database size={16} />}
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
          </form>

          {error ? <p className="status-text">{error}</p> : null}
          {fileName ? (
            <p className="status-text">{`Uploaded: ${fileName}${fileType ? ` (${fileType.toUpperCase()})` : ''}`}</p>
          ) : null}
        </Card>

        <Card className="data-tools-panel">
          <div className="data-tools-panel__header">
            <span className="icon-badge">
              <Wrench size={16} />
            </span>
            <div>
              <h3>Suggested Tools</h3>
              <p>Dynamic tool suggestions based on detected file type.</p>
            </div>
          </div>

          {rankedTools.length ? (
            <div className="data-tools-suggestions">
              {rankedTools.map((tool) => (
                <button
                  key={tool.name || tool.label}
                  className="data-tool-card data-tool-card--action"
                  onClick={() => runTool(tool)}
                  type="button"
                >
                  <div className="data-tool-card__copy">
                    <span className="ui-eyebrow">Tool</span>
                    <h4 className="data-tool-card__title">{tool.label || tool.name}</h4>
                    <p className="data-tool-card__description">{tool.description || 'No description available.'}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="status-text">Upload a supported file to view suggested tools.</p>
          )}
        </Card>
      </div>

      <FileExplorer />
    </section>
  );
}

export default DataToolsPage;
