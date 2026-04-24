export function FileTree({
  files = [],
  selectedPath = '',
  selectedFiles = [],
  onSelectFile,
  onToggleFile,
}) {
  return (
    <aside className="app-designer__file-tree">
      <div className="app-designer__panel-header">
        <h3>Proposed Files</h3>
      </div>
      {!files.length ? <p className="status-text">No proposed changes.</p> : null}
      <div className="app-designer__file-list">
        {files.map((file) => {
          const path = String(file?.path || '');
          const isSelected = selectedPath === path;
          const checked = selectedFiles.includes(path);
          return (
            <div key={path} className={isSelected ? 'app-designer__file-item app-designer__file-item--selected' : 'app-designer__file-item'}>
              <label className="app-designer__file-check">
                <input type="checkbox" checked={checked} onChange={() => onToggleFile?.(path)} />
              </label>
              <button type="button" className="app-designer__file-button" onClick={() => onSelectFile?.(path)}>
                {path}
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

export default FileTree;
