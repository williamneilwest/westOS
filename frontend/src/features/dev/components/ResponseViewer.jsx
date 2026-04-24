export function ResponseViewer({
  summary = '',
  rawResponse = '',
}) {
  return (
    <section className="app-designer__panel">
      <div className="app-designer__panel-header">
        <h3>Response</h3>
      </div>
      <div className="app-designer__summary">
        {summary || 'No response yet.'}
      </div>
      {rawResponse ? (
        <details className="app-designer__raw">
          <summary>Raw response</summary>
          <pre>{rawResponse}</pre>
        </details>
      ) : null}
    </section>
  );
}

export default ResponseViewer;
