import { useState, useEffect } from 'react';

interface ApiConfig {
  api_key: string;
  raw_api_key_configured: boolean;
  groq_api_key?: string;
  raw_groq_key_configured?: boolean;
  provider?: string;
  groq_model?: string;
  numFiles: number;
  chunkSize: number;
  overlap: number;
  docChunks: number;
  webChunks: number;
}

interface SaveSettingsParams {
  apiKey: string;
  groqApiKey: string;
  provider: string;
  groqModel: string;
  numFiles: number;
  chunkSize: number;
  overlap: number;
  docChunks: number;
  webChunks: number;
}

interface StartMenuProps {
  isOpen: boolean;
  onClose: () => void;
  apiConfig: ApiConfig;
  onSaveSettings: (settings: SaveSettingsParams) => void;
}

const StartMenu: React.FC<StartMenuProps> = ({ isOpen, onClose, apiConfig, onSaveSettings }) => {
  const [apiKey, setApiKey] = useState('');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [provider, setProvider] = useState('gemini');
  const [groqModel, setGroqModel] = useState('openai/gpt-oss-120b');
  const [numFiles, setNumFiles] = useState(10);
  const [chunkSize, setChunkSize] = useState(4000);
  const [overlap, setOverlap] = useState(1000);
  const [docChunks, setDocChunks] = useState(15);
  const [webChunks, setWebChunks] = useState(3);

  useEffect(() => {
    if (apiConfig) {
      setNumFiles(apiConfig.numFiles || 10);
      setChunkSize(apiConfig.chunkSize || 4000);
      setOverlap(apiConfig.overlap || 1000);
      setDocChunks(apiConfig.docChunks || 15);
      setWebChunks(apiConfig.webChunks || 3);
      setProvider(apiConfig.provider || 'gemini');
      setGroqModel(apiConfig.groq_model || 'openai/gpt-oss-120b');
    }
  }, [apiConfig]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings({ apiKey, groqApiKey, provider, groqModel, numFiles, chunkSize, overlap, docChunks, webChunks });
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

            <div className="start-menu-input-group" style={{ marginBottom: '12px' }}>
              <label className="start-menu-label">Model Provider</label>
              <select
                className="start-menu-input"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '4px', padding: '6px', cursor: 'pointer', outline: 'none' }}
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
              >
                <option value="gemini" style={{ backgroundColor: '#090c1f' }}>Google Gemini</option>
                <option value="groq" style={{ backgroundColor: '#090c1f' }}>Groq Cloud</option>
                <option value="ollama" style={{ backgroundColor: '#090c1f' }}>Local Ollama</option>
              </select>
            </div>

            {provider === 'gemini' && (
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
                  {apiConfig?.raw_api_key_configured ? `Active: ${apiConfig.api_key}` : 'No key set. Falling back to local Ollama (gemma4:e4b).'}
                </span>
              </div>
            )}

            {provider === 'groq' && (
              <>
                <div className="start-menu-input-group" style={{ marginBottom: '8px' }}>
                  <label className="start-menu-label">Groq API Key</label>
                  <input
                    type="password"
                    className="start-menu-input"
                    placeholder={apiConfig?.raw_groq_key_configured ? '••••••••••••••••••••' : 'Enter Groq API Key'}
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                  />
                  <span className="start-menu-hint">
                    {apiConfig?.raw_groq_key_configured ? `Active: ${apiConfig.groq_api_key}` : 'No key set. Falling back to local Ollama (gemma4:e4b).'}
                  </span>
                </div>
                <div className="start-menu-input-group">
                  <label className="start-menu-label">Groq Model Name</label>
                  <input
                    type="text"
                    className="start-menu-input"
                    placeholder="openai/gpt-oss-120b"
                    value={groqModel}
                    onChange={(e) => setGroqModel(e.target.value)}
                  />
                </div>
              </>
            )}

            {provider === 'ollama' && (
              <div className="start-menu-input-group" style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <span className="start-menu-hint" style={{ color: '#06b6d4', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  ⚡ Local Ollama Active
                </span>
                <span className="start-menu-hint" style={{ fontSize: '0.72rem', display: 'block', lineHeight: 1.3 }}>
                  Using local model <strong>gemma4:e4b</strong> hosted on your local system. No external API keys are required.
                </span>
              </div>
            )}

            <div className="start-menu-input-group" style={{ marginTop: '8px' }}>
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
                min="500" max="10000" step="500"
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
                min="100" max="2000" step="100"
                value={overlap}
                onChange={(e) => setOverlap(parseInt(e.target.value))}
              />
            </div>

            <div className="start-menu-input-group">
              <div className="start-menu-range-header">
                <span>📄 Document Chunks</span>
                <span className="start-menu-range-value">{docChunks} chunks</span>
              </div>
              <input
                type="range"
                className="start-menu-range"
                min="1" max="30" step="1"
                value={docChunks}
                onChange={(e) => setDocChunks(parseInt(e.target.value))}
              />
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px', display: 'block' }}>Top PDF chunks sent to the LLM</span>
            </div>

            <div className="start-menu-input-group">
              <div className="start-menu-range-header">
                <span>🌐 Web Chunks</span>
                <span className="start-menu-range-value">{webChunks} chunks</span>
              </div>
              <input
                type="range"
                className="start-menu-range"
                min="0" max="10" step="1"
                value={webChunks}
                onChange={(e) => setWebChunks(parseInt(e.target.value))}
              />
              <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)', marginTop: '2px', display: 'block' }}>Internet search chunks sent to the LLM</span>
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
