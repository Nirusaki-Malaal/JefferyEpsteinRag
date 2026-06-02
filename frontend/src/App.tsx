import { useState, useEffect, type FormEvent } from 'react';
import { ExternalLink, FileText, Globe2, RefreshCcw, Trash2, Wifi } from 'lucide-react';
import Desktop from './components/Desktop';
import Taskbar from './components/Taskbar';
import AeroWindow from './components/AeroWindow';
import StartMenu from './components/StartMenu';
import CopyDialog from './components/CopyDialog';
import ChatArea from './components/ChatArea';
import SourceSidebar from './components/SourceSidebar';
import SourcePopup from './components/SourcePopup';
import ClockGadget from './components/ClockGadget';

interface Source {
  chunk: string;
  source: string;
  score: number;
  url?: string;
}

interface Message {
  sender: 'user' | 'bot';
  text: string;
  time: string;
  sources?: Source[];
}

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

const isInternetSource = (source: Source) => (
  source.type === 'internet' || source.source.startsWith('http://') || source.source.startsWith('https://')
);

const App: React.FC = () => {
  const [isWindowOpen, setIsWindowOpen] = useState(true);
  const [isMainMaximized, setIsMainMaximized] = useState(false);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [query, setQuery] = useState('');
  const [popupSource, setPopupSource] = useState<Source | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: "Welcome to the Jeffrey Epstein Federal Records RAG Explorer.\n\nConfigure your model provider from the Start Menu, then ask a question to search documents and internet sources together.",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sources: [],
    },
  ]);

  const [activeSources, setActiveSources] = useState<Source[]>([]);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);

  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    api_key: '',
    raw_api_key_configured: false,
    groq_api_key: '',
    raw_groq_key_configured: false,
    provider: 'gemini',
    groq_model: 'openai/gpt-oss-120b',
    numFiles: 10,
    chunkSize: 4000,
    overlap: 1000,
    docChunks: 15,
    webChunks: 3,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const documentSourceCount = activeSources.filter((source) => !isInternetSource(source)).length;
  const internetSourceCount = activeSources.filter(isInternetSource).length;

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setApiConfig((prev) => ({
        ...prev,
        api_key: data.api_key,
        raw_api_key_configured: data.raw_api_key_configured,
        groq_api_key: data.groq_api_key,
        raw_groq_key_configured: data.raw_groq_key_configured,
        provider: data.provider,
        groq_model: data.groq_model,
      }));
    } catch (_) {}
  };

  const handleSaveSettings = async (settings: {
    apiKey: string;
    groqApiKey: string;
    provider: string;
    groqModel: string;
    numFiles: number;
    chunkSize: number;
    overlap: number;
    docChunks: number;
    webChunks: number;
  }) => {
    try {
      const payload: any = {
        provider: settings.provider,
        groq_model: settings.groqModel
      };
      if (settings.apiKey !== "") {
        payload.api_key = settings.apiKey;
      }
      if (settings.groqApiKey !== "") {
        payload.groq_api_key = settings.groqApiKey;
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setApiConfig((prev) => ({
          ...prev,
          numFiles: settings.numFiles,
          chunkSize: settings.chunkSize,
          overlap: settings.overlap,
          docChunks: settings.docChunks,
          webChunks: settings.webChunks,
        }));
        await fetchSettings();
        alert('Configuration saved successfully!');
      }
    } catch (err) {
      alert(`Error saving settings: ${err}`);
    }
  };

  const handleSearchSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const activeProvider = apiConfig.provider || 'gemini';
    const isGemini = activeProvider === 'gemini';
    const isGroq = activeProvider === 'groq';
    
    let llmLabel = 'Ollama';
    if (isGemini) llmLabel = 'Gemini';
    else if (isGroq) llmLabel = 'Groq';

    const currentQuery = query;
    setQuery('');

    setMessages((prev) => [
      ...prev,
      {
        sender: 'user',
        text: currentQuery,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    setIsLoading(true);
    setProgress(0);
    setStatusText('Optimizing legal search parameters...');

    const timeline = [
      { p: 12, s: `Optimizing search query with ${llmLabel} LLM...` },
      { p: 25, s: 'Query rephrased. Connecting to justice.gov archives...' },
      { p: 40, s: 'Searching federal registries for matching entries...' },
      { p: 58, s: 'Retrieving PDFs and copying to secure cache...' },
      { p: 72, s: 'Extracting text layers and running OCR...' },
      { p: 85, s: 'Generating fastembed vector mappings...' },
      { p: 94, s: 'Computing cosine similarities on top chunks...' },
      { p: 98, s: `Synthesizing answer via ${llmLabel} model...` },
    ];

    timeline.forEach((step) => {
      setTimeout(() => {
        setIsLoading((prev) => {
          if (prev) {
            setProgress(step.p);
            setStatusText(step.s);
          }
          return prev;
        });
      }, step.p * 100);
    });

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: currentQuery,
          num_files: apiConfig.numFiles,
          chunk_size: apiConfig.chunkSize,
          overlap: apiConfig.overlap,
          doc_chunks: apiConfig.docChunks,
          web_chunks: apiConfig.webChunks,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'RAG query pipeline failed.');
      }

      const data = await res.json();

      setProgress(100);
      setStatusText('Completed successfully.');

      setTimeout(() => {
        setIsLoading(false);
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: data.answer,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            sources: data.sources,
          },
        ]);
        setActiveSources(data.sources);
        if (data.sources && data.sources.length > 0) {
          const firstInternetSource = data.sources.find(isInternetSource);
          setSelectedSource(firstInternetSource || data.sources[0]);
        }
      }, 500);
    } catch (err: unknown) {
      setIsLoading(false);
      const message = err instanceof Error ? err.message : 'An error occurred.';
      alert(message);
    }
  };

  const handleCitationClick = (source: Source) => {
    setPopupSource(source);
  };

  const handleViewPdf = (source: Source) => {
    if (source.url) {
      window.open(source.url, '_blank');
    }
  };

  const resetSession = () => {
    setMessages([
      {
        sender: 'bot',
        text: "Welcome to the Jeffrey Epstein Federal Records RAG Explorer.\n\nConfigure your model provider from the Start Menu, then ask a question to search documents and internet sources together.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        sources: [],
      },
    ]);
    setActiveSources([]);
    setSelectedSource(null);
    setPopupSource(null);
    setQuery('');
  };

  return (
    <div className="desktop-container">
      <Desktop />

      <div className={`gadget-container ${isMainMaximized ? 'behind-window' : ''}`}>
        <ClockGadget />
      </div>

      <div className="desktop-content">
        {isWindowOpen && (
          <AeroWindow
            title="Jeffrey Epstein RAG Explorer"
            icon="⚖️"
            active
            draggable
            onClose={() => {
              setIsMainMaximized(false);
              setIsWindowOpen(false);
            }}
            onMinimize={() => {
              setIsMainMaximized(false);
              setIsWindowOpen(false);
            }}
            onMaximizedChange={setIsMainMaximized}
            style={{ width: '85%', height: '80%', maxWidth: '1100px', maxHeight: '720px' }}
          >
            <div className="explorer-shell">
              <div className="explorer-command-bar">
                <div className="command-group">
                  <button type="button" className="command-btn" onClick={fetchSettings}>
                    <RefreshCcw size={14} />
                    <span>Refresh</span>
                  </button>
                  <button type="button" className="command-btn" onClick={resetSession}>
                    <Trash2 size={14} />
                    <span>Clear</span>
                  </button>
                  {selectedSource?.url && (
                    <button type="button" className="command-btn" onClick={() => handleViewPdf(selectedSource)}>
                      <ExternalLink size={14} />
                      <span>Open Source</span>
                    </button>
                  )}
                </div>
                <div className="command-status">
                  <span><Wifi size={13} /> {apiConfig.provider || 'gemini'}</span>
                  <span><FileText size={13} /> {documentSourceCount} docs</span>
                  <span><Globe2 size={13} /> {internetSourceCount} web</span>
                </div>
              </div>
              <div className="explorer-layout">
                <SourceSidebar
                  sources={activeSources}
                  selectedSource={selectedSource}
                  onSelectSource={setSelectedSource}
                  onViewPdf={handleViewPdf}
                />
                <ChatArea
                  messages={messages}
                  query={query}
                  onQueryChange={setQuery}
                  onSubmit={handleSearchSubmit}
                  onCitationClick={handleCitationClick}
                />
              </div>
            </div>
          </AeroWindow>
        )}
      </div>

      <CopyDialog
        isOpen={isLoading}
        progress={progress}
        status={statusText}
        queryName={messages[messages.length - 1]?.text || ''}
      />

      <SourcePopup
        source={popupSource}
        onClose={() => setPopupSource(null)}
      />

      <StartMenu
        isOpen={isStartOpen}
        onClose={() => setIsStartOpen(false)}
        apiConfig={apiConfig}
        onSaveSettings={handleSaveSettings}
      />

      <Taskbar
        isWindowOpen={isWindowOpen}
        onToggleWindow={() => {
          if (isWindowOpen) setIsMainMaximized(false);
          setIsWindowOpen(!isWindowOpen);
        }}
        onToggleStartMenu={() => setIsStartOpen(!isStartOpen)}
      />
    </div>
  );
};

export default App;
