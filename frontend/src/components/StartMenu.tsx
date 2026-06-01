import { useState, useEffect } from 'react';

interface ApiConfig {
  api_key: string;
  raw_api_key_configured: boolean;
  numFiles: number;
  chunkSize: number;
  overlap: number;
}

interface SaveSettingsParams {
  apiKey: string;
  numFiles: number;
  chunkSize: number;
  overlap: number;
}

interface StartMenuProps {
  isOpen: boolean;
  onClose: () => void;
  apiConfig: ApiConfig;
  onSaveSettings: (settings: SaveSettingsParams) => void;
}

const StartMenu: React.FC<StartMenuProps> = ({ isOpen, onClose, apiConfig, onSaveSettings }) => {
  const [apiKey, setApiKey] = useState('');
  const [numFiles, setNumFiles] = useState(10);
  const [chunkSize, setChunkSize] = useState(400);
  const [overlap, setOverlap] = useState(100);

  useEffect(() => {
    if (apiConfig) {
      setNumFiles(apiConfig.numFiles || 10);
      setChunkSize(apiConfig.chunkSize || 400);
      setOverlap(apiConfig.overlap || 100);
    }
  }, [apiConfig]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({ apiKey, numFiles, chunkSize, overlap });
    onClose();
  };

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 998 }}
        onClick={onClose}
      />
      <div className="aero-glass-panel win7-start-menu open" style={{ zIndex: 999 }}>
        <div className="start-menu-header">
          <div className="start-menu-avatar">👤</div>
          <div className="start-menu-username">Agent</div>
        </div>
        <div className="start-menu-grid">
          <div className="start-menu-left">
            <div className="start-menu-section-title">⚙️ RAG Configuration</div>

            <div className="start-menu-input-group">
              <label className="start-menu-label">Gemini API Key</label>
              <input
                type="password"
                className="start-menu-input"
                placeholder={apiConfig?.raw_api_key_configured ? '••••••••••••••••••••' : 'Enter Gemini API Key'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <span className="start-menu-hint">
                {apiConfig?.raw_api_key_configured ? `Active: ${apiConfig.api_key}` : 'No API key set.'}
              </span>
            </div>

            <div className="start-menu-input-group">
              <div className="start-menu-range-header">
                <span>Search Depth</span>
                <span className="start-menu-range-value">{numFiles} files</span>
              </div>
              <input
                type="range"
                className="start-menu-range"
                min="3" max="30"
                value={numFiles}
                onChange={(e) => setNumFiles(parseInt(e.target.value))}
              />
            </div>

            <div className="start-menu-input-group">
              <div className="start-menu-range-header">
                <span>Chunk Size</span>
                <span className="start-menu-range-value">{chunkSize} chars</span>
              </div>
              <input
                type="range"
                className="start-menu-range"
                min="100" max="1000" step="50"
                value={chunkSize}
                onChange={(e) => setChunkSize(parseInt(e.target.value))}
              />
            </div>

            <div className="start-menu-input-group">
              <div className="start-menu-range-header">
                <span>Overlap</span>
                <span className="start-menu-range-value">{overlap} chars</span>
              </div>
              <input
                type="range"
                className="start-menu-range"
                min="20" max="250" step="10"
                value={overlap}
                onChange={(e) => setOverlap(parseInt(e.target.value))}
              />
            </div>

            <button className="win7-btn-glossy" onClick={handleSave} style={{ justifyContent: 'center', width: '100%' }}>
              ✅ Apply Changes
            </button>
          </div>

          <div className="start-menu-right">
            <div className="start-menu-item" onClick={() => alert('Epstein RAG System v1.0\nFastAPI + FastEmbed + Gemini 3.5 Flash\nSearches justice.gov federal archives in real-time.')}>
              <span className="start-menu-item-icon">💻</span>
              <strong>System Properties</strong>
            </div>
            <div className="start-menu-item" onClick={() => alert('Cached PDFs are stored in the local downloads folder.')}>
              <span className="start-menu-item-icon">📂</span>
              <span>Downloads Folder</span>
            </div>
            <div className="start-menu-item" onClick={() => alert('Scanned text is stored in the local ocr_text folder.')}>
              <span className="start-menu-item-icon">📝</span>
              <span>OCR Text Cache</span>
            </div>
            <div className="start-menu-item" onClick={() => alert('Embedding model: BAAI/bge-small-en-v1.5 (384-dim)')}>
              <span className="start-menu-item-icon">🧠</span>
              <span>Embedding Model</span>
            </div>
            <div style={{ flex: 1 }} />
            <button
              className="win7-btn-glossy win7-btn-danger"
              style={{ justifyContent: 'center', padding: '6px' }}
              onClick={() => {
                if (confirm('Clear all local PDF downloads and OCR caches?')) {
                  alert('Cache clearing request submitted.');
                }
              }}
            >
              🔴 Clear Cache
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default StartMenu;
