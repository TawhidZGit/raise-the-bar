import React from 'react';

interface BarMeterProps {
  score: number;
  label: string;
  color: string;
  side: 'left' | 'right';
  isActive: boolean;
}

const BarMeter: React.FC<BarMeterProps> = ({ score, label, color, side, isActive }) => {
  // Safe Tailwind color mapping
  const getColorClass = (c: string) => {
    if (c === 'purple') return 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]';
    if (c === 'green') return 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]';
    if (c === 'pink') return 'bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)]';
    if (c === 'cyan') return 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]';
    return 'bg-gray-500';
  };

  const getBorderColor = (c: string) => {
    if (c === 'purple') return 'border-purple-500';
    if (c === 'green') return 'border-green-500';
    if (c === 'pink') return 'border-pink-500';
    if (c === 'cyan') return 'border-cyan-500';
    return 'border-gray-500';
  };

  return (
    <div className={`flex flex-col h-full w-full max-w-[120px] items-center transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
      {/* Label */}
      <h2 className={`font-bangers text-2xl tracking-widest mb-2 text-white ${isActive ? 'animate-pulse' : ''}`}>
        {label}
      </h2>

      {/* The Meter Container */}
      <div className={`relative w-16 md:w-20 h-64 md:h-96 bg-gray-900 border-4 rounded-lg overflow-hidden ${getBorderColor(color)}`}>
        {/* Background Grid Lines */}
        <div className="absolute inset-0 z-0 flex flex-col justify-between py-2 opacity-30 pointer-events-none">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="w-full h-[1px] bg-white"></div>
          ))}
        </div>

        {/* The Liquid Fill */}
        <div 
          className={`absolute bottom-0 left-0 right-0 z-10 transition-all duration-1000 ease-out ${getColorClass(color)}`}
          style={{ height: `${score}%` }}
        >
          {/* Bubbles effect */}
          <div className="absolute top-0 w-full h-2 bg-white/30 animate-pulse"></div>
        </div>
      </div>

      {/* Numerical Score */}
      <div className="mt-4 font-mono text-xl font-bold bg-black/50 px-3 py-1 rounded border border-white/20">
        {Math.round(score)}%
      </div>
    </div>
  );
};

export default BarMeter;