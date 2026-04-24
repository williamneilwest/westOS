function diffClassForLine(line) {
  if (line.startsWith('+') && !line.startsWith('+++')) {
    return 'app-designer__diff-line app-designer__diff-line--add';
  }
  if (line.startsWith('-') && !line.startsWith('---')) {
    return 'app-designer__diff-line app-designer__diff-line--remove';
  }
  return 'app-designer__diff-line';
}

export function DiffViewer({ file }) {
  const diff = String(file?.diff || '').trim();
  const fallback = String(file?.new_content || '').trim();

  if (!file) {
    return (
      <section className="app-designer__panel app-designer__diff-panel">
        <div className="app-designer__panel-header">
          <h3>Diff</h3>
        </div>
        <p className="status-text">Select a file to inspect changes.</p>
      </section>
    );
  }

  return (
    <section className="app-designer__panel app-designer__diff-panel">
      <div className="app-designer__panel-header">
        <h3>Diff</h3>
        <span className="app-designer__file-pill">{file.path}</span>
      </div>
      {diff ? (
        <pre className="app-designer__diff">
          {diff.split('\n').map((line, index) => (
            <div key={`${file.path}-diff-${index}`} className={diffClassForLine(line)}>
              {line || ' '}
            </div>
          ))}
        </pre>
      ) : (
        <pre className="app-designer__diff">{fallback || 'No diff available.'}</pre>
      )}
    </section>
  );
}

export default DiffViewer;
