import { useRef, useEffect, type FormEvent } from 'react';

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

interface ChatAreaProps {
  messages: Message[];
  query: string;
  onQueryChange: (val: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCitationClick: (source: Source) => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({ messages, query, onQueryChange, onSubmit, onCitationClick }) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const renderBotText = (text: string, sources?: Source[]) => {
    const parts = text.split(/(\[?[A-Z0-9_-]+\.pdf\]?)/gi);
    return parts.map((part, i) => {
      const match = part.replace(/[\[\]]/g, '');
      const matchedSource = sources?.find(s => s.source === match);
      if (matchedSource) {
        return (
          <span
            key={i}
            className="bubble-citation-tag"
            onClick={() => onCitationClick(matchedSource)}
          >
            📄 {match}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className="explorer-main">
      <div className="win7-chat-scroller">
        {messages.map((msg, i) => (
          <div key={i} className={`bubble-container ${msg.sender}`}>
            <div className={`win7-bubble ${msg.sender}`}>
              {msg.sender === 'bot' ? (
                <div>{renderBotText(msg.text, msg.sources)}</div>
              ) : (
                msg.text
              )}
            </div>
            <div className={`bubble-meta ${msg.sender}`}>
              <span>{msg.sender === 'user' ? '👤 Me' : '🤖 AI Assistant'}</span>
              <span>•</span>
              <span>{msg.time}</span>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={onSubmit} className="explorer-status-bar">
        <div className="explorer-input-wrapper">
          <input
            type="text"
            className="explorer-input"
            placeholder="Ask about Epstein court records (e.g. connections of Bill Clinton)..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>
        <button type="submit" className="win7-btn-glossy">
          <span>🔍 Search</span>
        </button>
      </form>
    </div>
  );
};

export default ChatArea;
