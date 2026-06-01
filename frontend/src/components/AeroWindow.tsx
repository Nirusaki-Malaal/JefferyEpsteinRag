import { useState, useRef, useCallback, type ReactNode, type CSSProperties } from 'react';

interface AeroWindowProps {
  title: string;
  icon?: ReactNode;
  active?: boolean;
  draggable?: boolean;
  onClose: () => void;
  onMinimize?: () => void;
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
  children,
  style = {},
}) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const windowRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isDraggable) return;
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
  }, [isDraggable]);

  const posStyle: CSSProperties = position
    ? { position: 'fixed', left: position.x, top: position.y }
    : {};

  return (
    <div
      ref={windowRef}
      className={`aero-glass-panel aero-window ${active ? 'aero-window-active' : ''}`}
      style={{ display: 'flex', flexDirection: 'column', ...style, ...posStyle }}
    >
      <div
        className={`aero-title-bar ${isDraggable ? 'draggable' : ''}`}
        onMouseDown={handleMouseDown}
      >
        <div className="aero-title-text">
          {icon && <span className="aero-title-icon">{icon}</span>}
          <span>{title}</span>
        </div>
        <div className="aero-controls">
          <button className="aero-btn" title="Minimize" onClick={onMinimize}>
            <span style={{ fontSize: '10px', display: 'inline-block', transform: 'translateY(-2px)' }}>_</span>
          </button>
          <button className="aero-btn" title="Maximize">
            <span style={{ fontSize: '9px', border: '1px solid white', width: '8px', height: '6px', display: 'inline-block' }} />
          </button>
          <button className="aero-btn aero-btn-close" onClick={onClose} title="Close">
            <span style={{ fontSize: '10px', fontWeight: 'bold' }}>✕</span>
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
