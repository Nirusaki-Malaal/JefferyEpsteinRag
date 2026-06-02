import { Copy, ExternalLink, FileText, Globe2, X } from 'lucide-react';
import AeroWindow from './AeroWindow';

interface Source {
  chunk: string;
  source: string;
  source_id?: string;
  title?: string;
  type?: string;
  citation?: string;
  score: number;
  url?: string;
}

interface SourcePopupProps {
  source: Source | null;
  onClose: () => void;
}

const sourceType = (source: Source) => (
  source.type === 'internet' || source.source.startsWith('http://') || source.source.startsWith('https://') ? 'internet' : 'document'
);

const copyToClipboard = (value: string) => {
  navigator.clipboard?.writeText(value).catch(() => undefined);
};

const SourcePopup: React.FC<SourcePopupProps> = ({ source, onClose }) => {
  if (!source) return null;

  const kind = sourceType(source);
  const Icon = kind === 'internet' ? Globe2 : FileText;

  return (
    <div className="source-popup-overlay" onClick={onClose}>
      <div className="source-popup-content" onClick={(e) => e.stopPropagation()}>
        <AeroWindow title={kind === 'internet' ? 'Internet Source' : 'Document Source'} icon={<Icon size={16} />} active onClose={onClose}>
          <div className="source-popup-body">
            <div className="source-popup-filename">
              <Icon size={18} />
              <span>{source.source}</span>
            </div>
            {source.title && <div className="source-popup-title">{source.title}</div>}
            <div className="source-popup-meta-grid">
              <div><span>Type</span><strong>{kind === 'internet' ? 'Internet' : 'Document'}</strong></div>
              <div><span>Score</span><strong>{Math.round(source.score || 0)}%</strong></div>
              <div><span>ID</span><strong>{source.source_id || source.source}</strong></div>
            </div>
            <div className="source-popup-chunk">{source.chunk}</div>
            <div className="source-popup-actions">
              <button className="win7-btn-glossy" onClick={() => copyToClipboard(source.source)}>
                <Copy size={14} />
                <span>Copy Source</span>
              </button>
              <button className="win7-btn-glossy" onClick={() => copyToClipboard(source.chunk)}>
                <Copy size={14} />
                <span>Copy Text</span>
              </button>
              {source.url && (
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  <button className="win7-btn-glossy">
                    <ExternalLink size={14} />
                    <span>Open Original</span>
                  </button>
                </a>
              )}
              <button className="win7-btn-glossy" onClick={onClose}>
                <X size={14} />
                <span>Close</span>
              </button>
            </div>
          </div>
        </AeroWindow>
      </div>
    </div>
  );
};

export default SourcePopup;
