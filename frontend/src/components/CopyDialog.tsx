import AeroWindow from './AeroWindow';

interface CopyDialogProps {
  isOpen: boolean;
  progress: number;
  status: string;
  queryName: string;
}

const CopyDialog: React.FC<CopyDialogProps> = ({ isOpen, progress, status, queryName }) => {
  if (!isOpen) return null;

  return (
    <div className="copy-dialog-overlay">
      <AeroWindow title="Copying Legal Documents to Cache..." onClose={() => {}} active style={{ width: '450px' }}>
        <div className="copy-dialog-body">
          <div className="copy-dialog-header">
            <div className="copy-dialog-icon">📁</div>
            <div className="copy-dialog-meta">
              <div className="copy-dialog-title">
                Executing: "{queryName || 'Search'}"
              </div>
              <div className="copy-dialog-sub">
                From: <strong>justice.gov/multimedia-search</strong>
              </div>
              <div className="copy-dialog-sub">
                To: <strong>Local RAG Vector Store (BAAI/bge-small-en-v1.5)</strong>
              </div>
            </div>
          </div>

          <div className="copy-dialog-status">
            <span className="copy-dialog-status-label">Active Process: </span>
            {status || 'Preparing...'}
          </div>

          <div className="win7-progress-container">
            <div className="win7-progress-bar" style={{ width: `${progress}%` }} />
          </div>

          <div className="copy-dialog-footer">
            <div>Remaining: {progress > 85 ? 'Generating answer...' : `${10 - Math.floor(progress / 10)}s`}</div>
            <div>Completed: {progress}%</div>
          </div>
        </div>
      </AeroWindow>
    </div>
  );
};

export default CopyDialog;
