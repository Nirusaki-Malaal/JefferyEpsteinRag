import { useState, useEffect } from 'react';

interface TaskbarProps {
  isWindowOpen: boolean;
  onToggleWindow: () => void;
  onToggleStartMenu: () => void;
}

const WIN7_LOGO = (
  <svg viewBox="0 0 88 88" className="start-orb-icon">
    <g transform="translate(4,4)">
      <path d="M0 12.5L35 7.5V42H0z" fill="#00adef" />
      <path d="M40 6.8L80 0v42H40z" fill="#7fba00" />
      <path d="M0 47H35v34.5L0 76.5z" fill="#f25022" />
      <path d="M40 47H80v42L40 82.2z" fill="#ffb900" />
    </g>
  </svg>
);

const Taskbar: React.FC<TaskbarProps> = ({ isWindowOpen, onToggleWindow, onToggleStartMenu }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="aero-taskbar">
      <div className="start-orb" onClick={onToggleStartMenu}>
        {WIN7_LOGO}
      </div>

      <div
        className={`taskbar-btn ${isWindowOpen ? 'active' : ''}`}
        onClick={onToggleWindow}
      >
        ⚖️ Epstein Explorer
      </div>

      <div className="taskbar-tray">
        <div className="taskbar-tray-time">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="taskbar-tray-date">
          {time.toLocaleDateString([], { month: '2-digit', day: '2-digit', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
};

export default Taskbar;
