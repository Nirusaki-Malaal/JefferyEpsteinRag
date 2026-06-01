import { useState, useEffect, useCallback } from 'react';

const WALLPAPERS = [
  '/wallpapers/img0.jpg',
  '/wallpapers/img1.jpg',
  '/wallpapers/img2.jpg',
  '/wallpapers/img3.jpg',
  '/wallpapers/img4.jpg',
  '/wallpapers/img5.jpg',
  '/wallpapers/img7.jpg',
  '/wallpapers/img10.jpg',
  '/wallpapers/img13.jpg',
  '/wallpapers/img14.jpg',
  '/wallpapers/img19.jpg',
  '/wallpapers/img22.jpg',
  '/wallpapers/img25.jpg',
  '/wallpapers/img27.jpg',
  '/wallpapers/img30.jpg',
];

const Desktop: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);
  const [transitioning, setTransitioning] = useState(false);

  const preloadImage = useCallback((src: string) => {
    const img = new Image();
    img.src = src;
  }, []);

  useEffect(() => {
    const preloadNext = (currentIndex + 1) % WALLPAPERS.length;
    preloadImage(WALLPAPERS[preloadNext]);
  }, [currentIndex, preloadImage]);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = (currentIndex + 1) % WALLPAPERS.length;
      setNextIndex(next);
      setTransitioning(true);

      setTimeout(() => {
        setCurrentIndex(next);
        setTransitioning(false);
      }, 1500);
    }, 15000);

    return () => clearInterval(interval);
  }, [currentIndex]);

  return (
    <div className="wallpaper-layer">
      <img
        src={WALLPAPERS[currentIndex]}
        alt=""
        className={`wallpaper-img ${transitioning ? 'inactive' : 'active'}`}
        draggable={false}
      />
      {transitioning && (
        <img
          src={WALLPAPERS[nextIndex]}
          alt=""
          className="wallpaper-img active"
          draggable={false}
        />
      )}
    </div>
  );
};

export default Desktop;
