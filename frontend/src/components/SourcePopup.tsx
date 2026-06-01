import AeroWindow from './AeroWindow';

interface Source {
  chunk: string;
  source: string;
  score: number;
  url?: string;
}

interface SourcePopupProps {
  source: Source | null;
  onClose: () => void;
}

const SourcePopup: React.FC<SourcePopupProps> = ({ source, onClose }) => {
  if (!source) return null;

  return (
    <div className="source-popup-overlay" onClick={onClose}>
      <div className="source-popup-content" onClick={(e) => e.stopPropagation()}>
        <AeroWindow title={`Document: ${source.source}`} icon="📄" active onClose={onClose}>
          <div className="source-popup-body">
            <div className="source-popup-filename">
              📄 {source.source}
            </div>
            <div className="source-popup-score">
              Similarity Score: <span className="source-popup-score-value">{source.score}%</span>
            </div>
            <div className="source-popup-chunk">{source.chunk}</div>
            <div className="source-popup-actions">
              {source.url && (
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  <button className="win7-btn-glossy">
                    📥 View Original PDF ↗
                  </button>
                </a>
              )}
              <button className="win7-btn-glossy" onClick={onClose}>
                ✕ Close
              </button>
            </div>
          </div>
        </AeroWindow>
      </div>
    </div>
  );
};

export default SourcePopup;
