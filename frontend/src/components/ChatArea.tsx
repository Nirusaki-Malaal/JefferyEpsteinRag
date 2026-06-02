import { useRef, useEffect, type FormEvent, type ReactNode } from 'react';
import {
  Bot,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Globe2,
  Link2,
  ListChecks,
  Scale,
  Search,
  User,
  X,
} from 'lucide-react';

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

interface Message {
  sender: 'user' | 'bot';
  text: string;
  time: string;
  sources?: Source[];
}

interface AnswerPoint {
  text?: string;
  sources?: string[];
}

interface SourceAnalysis {
  source?: string;
  type?: string;
  relevance?: string;
  key_findings?: string[];
}

interface AnswerPayload {
  points?: AnswerPoint[] | AnswerPoint;
  source_analysis?: SourceAnalysis[] | SourceAnalysis;
  conclusion?: string[] | string;
}

interface ChatAreaProps {
  messages: Message[];
  query: string;
  onQueryChange: (val: string) => void;
  onSubmit: (e: FormEvent) => void;
  onCitationClick: (source: Source) => void;
}

const asArray = (value: unknown): any[] => {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
};

const cleanJsonText = (text: string) => {
  let cleaned = text.trim();
  const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (jsonBlockMatch) return jsonBlockMatch[1].trim();

  const bracketMatch = cleaned.match(/\{[\s\S]*\}/);
  if (bracketMatch) return bracketMatch[0].trim();

  return cleaned;
};

const normalizeToken = (token: string) => (
  token
    .replace(/^[\s[]+|[\]\s]+$/g, '')
    .replace(/[),.;:]+$/g, '')
);

const isWebSource = (source?: string) => Boolean(source?.startsWith('http://') || source?.startsWith('https://'));
const sourceIsInternet = (source: Source) => source.type === 'internet' || isWebSource(source.source);

const compactSourceLabel = (source: string) => {
  if (isWebSource(source)) {
    try {
      const url = new URL(source);
      return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
    } catch (_) {
      return source;
    }
  }

  return source.length > 46 ? `${source.slice(0, 22)}...${source.slice(-18)}` : source;
};

const findSource = (sourceToken: string, sources?: Source[]) => {
  const token = normalizeToken(sourceToken);
  return sources?.find((source) => (
    [source.source, source.source_id, source.url, source.citation]
      .filter(Boolean)
      .some((candidate) => normalizeToken(String(candidate)) === token)
  ));
};

const parseAnswer = (text: string): AnswerPayload | null => {
  try {
    const parsed = JSON.parse(cleanJsonText(text));
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (_) {
    return null;
  }
};

const ChatArea: React.FC<ChatAreaProps> = ({ messages, query, onQueryChange, onSubmit, onCitationClick }) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const renderCitationTag = (sourceText: string, sources?: Source[], compact = false) => {
    const token = normalizeToken(sourceText);
    const matchedSource = findSource(token, sources);
    const web = isWebSource(token) || Boolean(matchedSource && sourceIsInternet(matchedSource));
    const Icon = web ? Globe2 : FileText;
    const label = compact ? compactSourceLabel(token) : compactSourceLabel(matchedSource?.source || token);

    if (matchedSource) {
      return (
        <button
          type="button"
          className={`bubble-citation-tag ${web ? 'internet' : 'document'}`}
          onClick={() => onCitationClick(matchedSource)}
          title={matchedSource.title || matchedSource.source}
        >
          <Icon size={13} />
          <span>{label}</span>
        </button>
      );
    }

    if (web) {
      return (
        <a className="bubble-citation-tag internet" href={token} target="_blank" rel="noreferrer" title={token}>
          <Globe2 size={13} />
          <span>{label}</span>
          <ExternalLink size={11} />
        </a>
      );
    }

    return (
      <span className="bubble-citation-tag ghost" title={token}>
        <Link2 size={13} />
        <span>{label}</span>
      </span>
    );
  };

  const renderBotText = (text: string, sources?: Source[]) => {
    const parts = text.split(/(https?:\/\/[^\s<>"'\])]+|\[?[A-Z0-9_-]+\.(?:pdf|url)\]?)/gi);
    return parts.map((part, i) => {
      const token = normalizeToken(part);
      if (/^https?:\/\//i.test(token) || /^[A-Z0-9_-]+\.(?:pdf|url)$/i.test(token)) {
        return <span key={`${token}-${i}`}>{renderCitationTag(token, sources, true)}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const renderCitationList = (items: string[] | undefined, sources?: Source[]) => {
    const uniqueItems = [...new Set(asArray(items).map((item) => String(item)).filter(Boolean))];
    if (!uniqueItems.length) return null;

    return (
      <div className="answer-citation-row">
        {uniqueItems.map((item) => (
          <span key={item}>{renderCitationTag(item, sources, true)}</span>
        ))}
      </div>
    );
  };

  const renderReportSection = (title: string, icon: ReactNode, children: ReactNode) => (
    <section className="answer-section">
      <div className="answer-section-title">
        {icon}
        <span>{title}</span>
      </div>
      {children}
    </section>
  );

  const renderStructuredAnswer = (parsed: AnswerPayload, sources: Source[] | undefined, rawText: string) => {
    const points = asArray(parsed.points) as AnswerPoint[];
    const sourceAnalysis = asArray(parsed.source_analysis) as SourceAnalysis[];
    const conclusions = asArray(parsed.conclusion).map((item) => String(item));
    const citedSources = new Set(points.flatMap((point) => asArray(point.sources).map((item) => String(item))));
    const internetSources = (sources || []).filter(sourceIsInternet);

    return (
      <div className="answer-report">
        <div className="answer-report-header">
          <div className="answer-report-title">
            <Scale size={18} />
            <span>Evidence Report</span>
          </div>
          <div className="answer-header-actions">
            <div className="answer-metrics">
              <span>{points.length} findings</span>
              <span>{sourceAnalysis.length} sources explained</span>
              <span>{citedSources.size} citations</span>
            </div>
            <button type="button" className="answer-copy-button" onClick={() => navigator.clipboard?.writeText(rawText)}>
              <Copy size={13} />
              <span>Copy</span>
            </button>
          </div>
        </div>

        <div className={`answer-internet-strip ${internetSources.length ? '' : 'empty'}`}>
          <div className="answer-internet-title">
            <Globe2 size={14} />
            <span>Internet Sources</span>
          </div>
          {internetSources.length ? (
            <div className="answer-internet-list">
              {internetSources.slice(0, 8).map((source, idx) => (
                <span key={`${source.source}-${idx}`}>
                  {renderCitationTag(source.source, sources, true)}
                </span>
              ))}
            </div>
          ) : (
            <span className="answer-internet-empty">No internet sources were returned for this answer.</span>
          )}
        </div>

        {points.length > 0 && renderReportSection(
          'Findings',
          <ListChecks size={15} />,
          <div className="answer-findings">
            {points.map((point, idx) => (
              <article key={idx} className="answer-finding">
                <div className="answer-finding-index">{idx + 1}</div>
                <div className="answer-finding-body">
                  <p>{renderBotText(String(point.text || ''), sources)}</p>
                  {renderCitationList(point.sources, sources)}
                </div>
              </article>
            ))}
          </div>
        )}

        {sourceAnalysis.length > 0 && renderReportSection(
          'Source Analysis',
          <FileText size={15} />,
          <div className="answer-source-grid">
            {sourceAnalysis.map((item, idx) => {
              const sourceText = String(item.source || `Source ${idx + 1}`);
              const matchedSource = findSource(sourceText, sources);
              const web = isWebSource(sourceText) || item.type === 'internet';
              const Icon = web ? Globe2 : FileText;
              const findings = asArray(item.key_findings).map((finding) => String(finding));

              return (
                <article key={`${sourceText}-${idx}`} className={`answer-source-card ${web ? 'internet' : 'document'}`}>
                  <div className="answer-source-card-header">
                    <Icon size={15} />
                    <button
                      type="button"
                      className="answer-source-title"
                      onClick={() => matchedSource && onCitationClick(matchedSource)}
                      disabled={!matchedSource}
                      title={sourceText}
                    >
                      {compactSourceLabel(sourceText)}
                    </button>
                    <span className="answer-source-type">{web ? 'Internet' : 'Document'}</span>
                  </div>
                  {item.relevance && (
                    <p className="answer-source-relevance">{renderBotText(item.relevance, sources)}</p>
                  )}
                  {findings.length > 0 && (
                    <ul className="answer-source-findings">
                      {findings.map((finding, findingIdx) => (
                        <li key={findingIdx}>{renderBotText(finding, sources)}</li>
                      ))}
                    </ul>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {conclusions.length > 0 && renderReportSection(
          'Conclusion',
          <CheckCircle2 size={15} />,
          <ul className="answer-conclusion-list">
            {conclusions.map((item, idx) => (
              <li key={idx}>{renderBotText(item, sources)}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const renderBotMessage = (text: string, sources?: Source[]) => {
    const parsed = parseAnswer(text);
    if (parsed && (parsed.points || parsed.source_analysis || parsed.conclusion)) {
      return renderStructuredAnswer(parsed, sources, text);
    }

    return <div className="plain-bot-text">{renderBotText(text, sources)}</div>;
  };

  return (
    <div className="explorer-main">
      <div className="win7-chat-scroller">
        {messages.map((msg, i) => (
          <div key={i} className={`bubble-container ${msg.sender}`}>
            <div className={`win7-bubble ${msg.sender}`}>
              {msg.sender === 'bot' ? (
                renderBotMessage(msg.text, msg.sources)
              ) : (
                msg.text
              )}
            </div>
            <div className={`bubble-meta ${msg.sender}`}>
              <span className="bubble-meta-person">
                {msg.sender === 'user' ? <User size={12} /> : <Bot size={12} />}
                {msg.sender === 'user' ? 'Me' : 'AI Assistant'}
              </span>
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
            placeholder="Ask about Epstein court records..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
          {query && (
            <button type="button" className="input-clear-button" onClick={() => onQueryChange('')} title="Clear">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="explorer-input-meta">
          <span>{query.length} chars</span>
          <span>{messages[messages.length - 1]?.sources?.length || 0} sources</span>
        </div>
        <button type="submit" className="win7-btn-glossy">
          <Search size={15} />
          <span>Search</span>
        </button>
      </form>
    </div>
  );
};

export default ChatArea;
