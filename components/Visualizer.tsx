import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  isListening: boolean;
  color: string;
}

const Visualizer: React.FC<VisualizerProps> = ({ isListening, color }) => {
  const barsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (!isListening) return;
    
    const interval = setInterval(() => {
      barsRef.current.forEach((bar) => {
        if (bar) {
          const height = Math.floor(Math.random() * 80) + 10;
          bar.style.height = `${height}%`;
        }
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isListening]);

  return (
    <div className="h-24 w-full flex items-center justify-center gap-1 bg-black/30 rounded-lg p-2 border border-white/10 backdrop-blur-sm">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) barsRef.current[i] = el;
          }}
          className={`w-2 transition-all duration-100 ease-in-out rounded-full ${isListening ? 'opacity-100' : 'opacity-20 h-2'}`}
          style={{ 
            backgroundColor: color,
            height: isListening ? '40%' : '10%' 
          }}
        />
      ))}
    </div>
  );
};

export default Visualizer;