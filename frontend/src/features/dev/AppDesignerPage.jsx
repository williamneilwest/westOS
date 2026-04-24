import { useMemo, useState } from 'react';
import { Card, CardHeader } from '../../app/ui/Card';
import {
  applyDevCodexChanges,
  rejectDevCodexChanges,
  runDevCodexPrompt,
} from '../../app/services/api';
import PromptEditor from './components/PromptEditor';
import ResponseViewer from './components/ResponseViewer';
import FileTree from './components/FileTree';
import DiffViewer from './components/DiffViewer';

export function AppDesignerPage() {
  const [prompt, setPrompt] = useState('');
  const [running, setRunning] = useState(false);
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [summary, setSummary] = useState('');
  const [rawResponse, setRawResponse] = useState('');
  const [stageId, setStageId] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedFilePath, setSelectedFilePath] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);

  const selectedFile = useMemo(
    () => files.find((item) => item.path === selectedFilePath) || null,
    [files, selectedFilePath]
  );

  async function handleRunPrompt() {
    const nextPrompt = String(prompt || '').trim();
    if (!nextPrompt) {
      setError('Prompt is required.');
      return;
    }

    setRunning(true);
    setError('');
    setMessage('');
    try {
      const response = await runDevCodexPrompt(nextPrompt);
      const nextFiles = Array.isArray(response?.files) ? response.files : [];
      setSummary(String(response?.summary || '').trim());
      setRawResponse(String(response?.raw_response || '').trim());
      setStageId(String(response?.stage_id || '').trim());
      setFiles(nextFiles);
      const initialPaths = nextFiles.map((item) => item.path).filter(Boolean);
      setSelectedFiles(initialPaths);
      setSelectedFilePath(initialPaths[0] || '');
      setMessage(`Staged ${nextFiles.length} file${nextFiles.length === 1 ? '' : 's'} for review.`);
    } catch (requestError) {
      setError(requestError.message || 'Prompt run failed.');
      setFiles([]);
      setSelectedFiles([]);
      setSelectedFilePath('');
      setStageId('');
    } finally {
      setRunning(false);
    }
  }

  function toggleSelectedFile(path) {
    setSelectedFiles((current) => (
      current.includes(path)
        ? current.filter((item) => item !== path)
        : [...current, path]
    ));
  }

  async function handleApprove() {
    if (!stageId) {
      setError('No staged changes to apply.');
      return;
    }

    setBusyAction('approve');
    setError('');
    setMessage('');
    try {
      const response = await applyDevCodexChanges({
        stageId,
        approvedFiles: selectedFiles,
      });
      setMessage(`Applied ${Number(response?.applied_count || 0)} file change(s). Backups were created.`);
    } catch (requestError) {
      setError(requestError.message || 'Apply failed.');
    } finally {
      setBusyAction('');
    }
  }

  async function handleReject() {
    if (!stageId) {
      setError('No staged changes to reject.');
      return;
    }

    setBusyAction('reject');
    setError('');
    setMessage('');
    try {
      await rejectDevCodexChanges(stageId);
      setMessage('Staged changes rejected.');
      setFiles([]);
      setSelectedFiles([]);
      setSelectedFilePath('');
      setStageId('');
      setSummary('');
      setRawResponse('');
    } catch (requestError) {
      setError(requestError.message || 'Reject failed.');
    } finally {
      setBusyAction('');
    }
  }

  return (
    <section className="module">
      <Card>
        <CardHeader
          eyebrow="/app/dev/designer"
          title="App Designer"
          description="Run prompt-driven code proposals, review staged diffs, then explicitly approve or reject changes."
        />
        {error ? <p className="status-text status-text--error">{error}</p> : null}
        {message ? <p className="status-text">{message}</p> : null}
      </Card>

      <PromptEditor
        prompt={prompt}
        onPromptChange={setPrompt}
        onRun={() => void handleRunPrompt()}
        running={running}
      />

      <ResponseViewer summary={summary} rawResponse={rawResponse} />

      <div className="app-designer__proposed-layout">
        <FileTree
          files={files}
          selectedPath={selectedFilePath}
          selectedFiles={selectedFiles}
          onSelectFile={setSelectedFilePath}
          onToggleFile={toggleSelectedFile}
        />
        <DiffViewer file={selectedFile} />
      </div>

      <section className="app-designer__panel">
        <div className="app-designer__panel-header">
          <h3>Actions</h3>
        </div>
        <div className="app-designer__actions">
          <button
            type="button"
            className="ui-button ui-button--primary"
            onClick={() => void handleApprove()}
            disabled={!stageId || !selectedFiles.length || busyAction === 'reject'}
          >
            {busyAction === 'approve' ? 'Applying...' : 'Approve'}
          </button>
          <button
            type="button"
            className="ui-button ui-button--secondary"
            onClick={() => void handleReject()}
            disabled={!stageId || busyAction === 'approve'}
          >
            {busyAction === 'reject' ? 'Rejecting...' : 'Reject'}
          </button>
        </div>
      </section>
    </section>
  );
}

export default AppDesignerPage;
