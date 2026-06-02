import { useState, useRef, useCallback, type ReactNode, type CSSProperties } from 'react';
import { Maximize2, Minimize2, Minus, X } from 'lucide-react';

interface AeroWindowProps {
  title: string;
  icon?: ReactNode;
  active?: boolean;
  draggable?: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  onMaximizedChange?: (maximized: boolean) => void;
  children: ReactNode;
  style?: CSSProperties;
}

const AeroWindow: React.FC<AeroWindowProps> = ({
  title,
  icon,
  active = true,
  draggable: isDraggable = false,
  onClose,
  onMinimize,
  onMaximizedChange,
  children,
  style = {},
}) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isDraggable || isMaximized) return;
    e.preventDefault();
    const rect = windowRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setPosition({
        x: dragRef.current.origX + dx,
        y: dragRef.current.origY + dy,
      });
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isDraggable, isMaximized]);

  const toggleMaximized = () => {
    setIsMaximized((current) => {
      const next = !current;
      onMaximizedChange?.(next);
      return next;
    });
  };

  const posStyle: CSSProperties = position && !isMaximized
    ? { position: 'fixed', left: position.x, top: position.y }
    : {};

  return (
    <div
      ref={windowRef}
      className={`aero-glass-panel aero-window ${active ? 'aero-window-active' : ''} ${isMaximized ? 'maximized' : ''}`}
      style={{ display: 'flex', flexDirection: 'column', ...style, ...posStyle }}
    >
      <div
        className={`aero-title-bar ${isDraggable ? 'draggable' : ''}`}
        onMouseDown={handleMouseDown}
        onDoubleClick={toggleMaximized}
      >
        <div className="aero-title-text">
          {icon && <span className="aero-title-icon">{icon}</span>}
          <span>{title}</span>
        </div>
        <div className="aero-controls">
          <button className="aero-btn" title="Minimize" onClick={onMinimize}>
            <Minus size={12} />
          </button>
          <button className="aero-btn" title={isMaximized ? 'Restore' : 'Maximize'} onClick={toggleMaximized}>
            {isMaximized ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
          </button>
          <button className="aero-btn aero-btn-close" onClick={onClose} title="Close">
            <X size={12} />
          </button>
        </div>
      </div>
      <div className="win7-client-area">
        {children}
      </div>
    </div>
  );
};

export default AeroWindow;
