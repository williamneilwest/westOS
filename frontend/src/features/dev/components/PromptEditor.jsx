export function PromptEditor({
  prompt = '',
  onPromptChange,
  onRun,
  running = false,
}) {
  return (
    <section className="app-designer__panel">
      <div className="app-designer__panel-header">
        <h3>Prompt Editor</h3>
      </div>
      <label className="settings-field">
        <span>Codex prompt</span>
        <textarea
          className="app-designer__textarea"
          value={prompt}
          onChange={(event) => onPromptChange?.(event.target.value)}
          placeholder="Describe the code change you want to generate..."
        />
      </label>
      <div className="app-designer__actions">
        <button type="button" className="ui-button ui-button--primary" onClick={onRun} disabled={running || !prompt.trim()}>
          {running ? 'Running...' : 'Run Prompt'}
        </button>
      </div>
    </section>
  );
}

export default PromptEditor;
