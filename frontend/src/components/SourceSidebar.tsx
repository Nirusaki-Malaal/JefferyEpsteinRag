interface Source {
  chunk: string;
  source: string;
  score: number;
  url?: string;
}

interface SourceSidebarProps {
  sources: Source[];
  selectedSource: Source | null;
  onSelectSource: (source: Source) => void;
  onViewPdf: (source: Source) => void;
}

const SourceSidebar: React.FC<SourceSidebarProps> = ({ sources, selectedSource, onSelectSource, onViewPdf }) => {
  return (
    <div className="explorer-sidebar">
      <div className="sidebar-section-title">📁 Cited Documents</div>

      {sources.length === 0 ? (
        <div className="sidebar-empty">
          No documents cited yet.<br />Submit a search query.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {sources.map((src, i) => (
            <div
              key={i}
              className={`sidebar-item ${selectedSource === src ? 'active' : ''}`}
              onClick={() => onSelectSource(src)}
            >
              <span>📄</span>
              <span className="sidebar-item-name">{src.source}</span>
            </div>
          ))}
        </div>
      )}

      {selectedSource && (
        <div className="sidebar-detail">
          <div className="sidebar-detail-title">Selected Citation:</div>
          <div className="sidebar-detail-chunk">{selectedSource.chunk}</div>
          <div className="sidebar-detail-footer">
            <span>Score: <strong>{selectedSource.score}% Match</strong></span>
            {selectedSource.url ? (
              <span className="sidebar-detail-link" onClick={() => onViewPdf(selectedSource)}>View PDF ↗</span>
            ) : (
              <span style={{ color: '#888' }}>No Link</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SourceSidebar;
