import { useState, useEffect } from 'react';

const ClockGadget: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours() % 12;
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();

  const hourDeg = (hours + minutes / 60) * 30;
  const minDeg = (minutes + seconds / 60) * 6;
  const secDeg = seconds * 6;

  return (
    <div className="win7-gadget">
      <div className="gadget-clock-hand-hour" style={{ transform: `rotate(${hourDeg}deg)` }} />
      <div className="gadget-clock-hand-min" style={{ transform: `rotate(${minDeg}deg)` }} />
      <div className="gadget-clock-hand-sec" style={{ transform: `rotate(${secDeg}deg)` }} />
      <div className="gadget-center-dot" />
      <div className="gadget-time-text">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
};

export default ClockGadget;
