import { FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../app/ui/Card';

export function FileExplorer() {
  const navigate = useNavigate();

  return (
    <Card className="data-tools-panel data-tools-output">
      <div className="data-tools-panel__header">
        <span className="icon-badge" aria-hidden="true">
          <FolderOpen size={16} />
        </span>
        <div>
          <h3>File Management</h3>
          <p>All uploaded datasets, KB files, and analyses are managed in one place.</p>
        </div>
      </div>
      <div className="table-actions">
        <button
          className="compact-toggle"
          type="button"
          onClick={() => navigate('/app/uploads')}
        >
          Open Uploads
        </button>
      </div>
    </Card>
  );
}

export default FileExplorer;
