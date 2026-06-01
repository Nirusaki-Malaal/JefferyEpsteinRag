import { useState, useEffect, type FormEvent } from 'react';
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
  numFiles: number;
  chunkSize: number;
  overlap: number;
}

const App: React.FC = () => {
  const [isWindowOpen, setIsWindowOpen] = useState(true);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [query, setQuery] = useState('');
  const [popupSource, setPopupSource] = useState<Source | null>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: "Welcome to the Jeffrey Epstein Federal Records RAG Explorer.\n\nConfigure your Gemini API Key via the Start Menu (bottom-left orb), then type a question below to search the archives.",
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sources: [],
    },
  ]);

  const [activeSources, setActiveSources] = useState<Source[]>([]);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);

  const [apiConfig, setApiConfig] = useState<ApiConfig>({
    api_key: '',
    raw_api_key_configured: false,
    numFiles: 10,
    chunkSize: 400,
    overlap: 100,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setApiConfig((prev) => ({
        ...prev,
        api_key: data.api_key,
        raw_api_key_configured: data.raw_api_key_configured,
      }));
    } catch (_) {}
  };

  const handleSaveSettings = async (settings: {
    apiKey: string;
    numFiles: number;
    chunkSize: number;
    overlap: number;
  }) => {
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: settings.apiKey }),
      });
      const data = await res.json();
      if (data.status === 'success') {
        setApiConfig((prev) => ({
          ...prev,
          numFiles: settings.numFiles,
          chunkSize: settings.chunkSize,
          overlap: settings.overlap,
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

    if (!apiConfig.raw_api_key_configured) {
      alert('Please configure your Gemini API Key first! Click the Start Orb.');
      setIsStartOpen(true);
      return;
    }

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
      { p: 12, s: 'Optimizing search query with Gemini LLM...' },
      { p: 25, s: 'Query rephrased. Connecting to justice.gov archives...' },
      { p: 40, s: 'Searching federal registries for matching entries...' },
      { p: 58, s: 'Retrieving PDFs and copying to secure cache...' },
      { p: 72, s: 'Extracting text layers and running OCR...' },
      { p: 85, s: 'Generating fastembed vector mappings...' },
      { p: 94, s: 'Computing cosine similarities on top chunks...' },
      { p: 98, s: 'Synthesizing answer via Gemini model...' },
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
          setSelectedSource(data.sources[0]);
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

  return (
    <div className="desktop-container">
      <Desktop />

      <div className="gadget-container">
        <ClockGadget />
      </div>

      <div className="desktop-content">
        {isWindowOpen && (
          <AeroWindow
            title="Jeffrey Epstein RAG Explorer"
            icon="⚖️"
            active
            draggable
            onClose={() => setIsWindowOpen(false)}
            onMinimize={() => setIsWindowOpen(false)}
            style={{ width: '85%', height: '80%', maxWidth: '1100px', maxHeight: '720px' }}
          >
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
        onToggleWindow={() => setIsWindowOpen(!isWindowOpen)}
        onToggleStartMenu={() => setIsStartOpen(!isStartOpen)}
      />
    </div>
  );
};

export default App;
