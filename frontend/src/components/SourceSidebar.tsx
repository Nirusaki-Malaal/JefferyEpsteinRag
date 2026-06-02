import { useMemo, useState } from 'react';
import { Copy, ExternalLink, FileText, FolderSearch, Globe2, Search, SlidersHorizontal } from 'lucide-react';

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

interface SourceSidebarProps {
  sources: Source[];
  selectedSource: Source | null;
  onSelectSource: (source: Source) => void;
  onViewPdf: (source: Source) => void;
}

type SourceFilter = 'all' | 'document' | 'internet';
type SourceSort = 'score' | 'name' | 'type';

const sourceType = (source: Source) => (
  source.type === 'internet' || source.source.startsWith('http://') || source.source.startsWith('https://') ? 'internet' : 'document'
);

const compactLabel = (value: string) => {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const url = new URL(value);
      return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`;
    } catch (_) {
      return value;
    }
  }

  return value;
};

const copyToClipboard = (value: string) => {
  navigator.clipboard?.writeText(value).catch(() => undefined);
};

const SourceSidebar: React.FC<SourceSidebarProps> = ({ sources, selectedSource, onSelectSource, onViewPdf }) => {
  const [filter, setFilter] = useState<SourceFilter>('all');
  const [sort, setSort] = useState<SourceSort>('score');
  const [search, setSearch] = useState('');

  const stats = useMemo(() => {
    const documents = sources.filter((source) => sourceType(source) === 'document').length;
    const internet = sources.filter((source) => sourceType(source) === 'internet').length;
    const average = sources.length
      ? Math.round(sources.reduce((sum, source) => sum + Number(source.score || 0), 0) / sources.length)
      : 0;

    return { documents, internet, average };
  }, [sources]);

  const visibleSources = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = sources.filter((source) => {
      const kind = sourceType(source);
      const haystack = [source.source, source.source_id, source.title, source.url, source.chunk]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (filter === 'all' || filter === kind) && (!needle || haystack.includes(needle));
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'name') return compactLabel(a.source).localeCompare(compactLabel(b.source));
      if (sort === 'type') return sourceType(a).localeCompare(sourceType(b));
      return Number(b.score || 0) - Number(a.score || 0);
    });
  }, [filter, search, sort, sources]);

  const selectedKind = selectedSource ? sourceType(selectedSource) : 'document';
  const selectedLabel = selectedSource ? compactLabel(selectedSource.source) : '';

  return (
    <div className="explorer-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-section-title">
          <FolderSearch size={15} />
          <span>Sources</span>
        </div>
        <div className="sidebar-stat-grid">
          <div><strong>{sources.length}</strong><span>Total</span></div>
          <div><strong>{stats.documents}</strong><span>Docs</span></div>
          <div><strong>{stats.internet}</strong><span>Web</span></div>
          <div><strong>{stats.average}%</strong><span>Avg</span></div>
        </div>
      </div>

      <div className="sidebar-tools">
        <div className="sidebar-search">
          <Search size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter sources"
          />
        </div>

        <div className="sidebar-filter-row">
          {(['all', 'document', 'internet'] as SourceFilter[]).map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? 'active' : ''}
              onClick={() => setFilter(item)}
            >
              {item === 'all' ? 'All' : item === 'document' ? 'Docs' : 'Web'}
            </button>
          ))}
        </div>

        <label className="sidebar-sort">
          <SlidersHorizontal size={13} />
          <select value={sort} onChange={(e) => setSort(e.target.value as SourceSort)}>
            <option value="score">Score</option>
            <option value="name">Name</option>
            <option value="type">Type</option>
          </select>
        </label>
      </div>

      {visibleSources.length === 0 ? (
        <div className="sidebar-empty">
          No matching sources yet.
        </div>
      ) : (
        <div className="sidebar-source-list">
          {visibleSources.map((src, i) => {
            const kind = sourceType(src);
            const Icon = kind === 'internet' ? Globe2 : FileText;
            const label = compactLabel(src.source);

            return (
              <button
                key={`${src.source}-${i}`}
                type="button"
                className={`sidebar-item ${selectedSource === src ? 'active' : ''}`}
                onClick={() => onSelectSource(src)}
                title={src.title || src.source}
              >
                <Icon size={15} />
                <span className="sidebar-item-main">
                  <span className="sidebar-item-name">{label}</span>
                  <span className="sidebar-item-sub">{src.title || src.source_id || kind}</span>
                </span>
                <span className={`sidebar-source-pill ${kind}`}>{Math.round(src.score || 0)}%</span>
              </button>
            );
          })}
        </div>
      )}

      {selectedSource && (
        <div className="sidebar-detail">
          <div className="sidebar-detail-title">
            {selectedKind === 'internet' ? <Globe2 size={15} /> : <FileText size={15} />}
            <span>{selectedLabel}</span>
          </div>
          {selectedSource.title && <div className="sidebar-detail-subtitle">{selectedSource.title}</div>}
          <div className="sidebar-score-track">
            <span style={{ width: `${Math.max(0, Math.min(100, selectedSource.score || 0))}%` }} />
          </div>
          <div className="sidebar-detail-chunk">{selectedSource.chunk}</div>
          <div className="sidebar-action-row">
            <button type="button" className="win7-btn-glossy" onClick={() => copyToClipboard(selectedSource.source)}>
              <Copy size={13} />
              <span>Copy Source</span>
            </button>
            <button type="button" className="win7-btn-glossy" onClick={() => copyToClipboard(selectedSource.chunk)}>
              <Copy size={13} />
              <span>Copy Text</span>
            </button>
            {selectedSource.url && (
              <button type="button" className="win7-btn-glossy" onClick={() => onViewPdf(selectedSource)}>
                <ExternalLink size={13} />
                <span>Open</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SourceSidebar;
