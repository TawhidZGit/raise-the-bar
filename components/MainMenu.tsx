import React from 'react';
import { GameMode } from '../types';
import { Mic, Heart, Zap, Play } from 'lucide-react';

interface MainMenuProps {
  onStart: (mode: GameMode) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 relative z-10">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 z-0 pointer-events-none" />
      
      <div className="z-10 flex flex-col items-center animate-float">
        <h1 className="font-graffiti text-6xl md:text-8xl text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] mb-2 text-center">
          RAISE THE BAR
        </h1>
        <p className="font-mono text-gray-400 mb-12 tracking-widest text-sm md:text-base">
          AI-POWERED LYRICAL COMBAT
        </p>
      </div>

      <div className="z-10 grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Battle Mode Card */}
        <button 
          onClick={() => onStart(GameMode.BATTLE)}
          className="group relative bg-gray-900/80 backdrop-blur-md border-2 border-purple-600 rounded-xl p-8 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] text-left flex flex-col gap-4 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
            <Zap size={100} />
          </div>
          <div className="bg-purple-600 w-12 h-12 rounded-lg flex items-center justify-center mb-2">
            <Mic className="text-white" />
          </div>
          <div>
            <h3 className="font-bangers text-3xl text-purple-400 mb-2">Street Battle</h3>
            <p className="text-gray-400 text-sm">
              Spit chaotic bars. Get rated on aggression, rhyme density, and street cred by <span className="text-purple-300">Featherless AI</span>.
            </p>
          </div>
          <div className="mt-auto flex items-center gap-2 text-purple-400 text-sm font-bold uppercase tracking-wider">
            Start Battle <Play size={16} />
          </div>
        </button>

        {/* Kindness Mode Card */}
        <button 
          onClick={() => onStart(GameMode.KINDNESS)}
          className="group relative bg-gray-900/80 backdrop-blur-md border-2 border-pink-500 rounded-xl p-8 transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(236,72,153,0.4)] text-left flex flex-col gap-4 overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
            <Heart size={100} />
          </div>
          <div className="bg-pink-500 w-12 h-12 rounded-lg flex items-center justify-center mb-2">
            <Heart className="text-white" />
          </div>
          <div>
            <h3 className="font-bangers text-3xl text-pink-400 mb-2">Kill 'Em w/ Kindness</h3>
            <p className="text-gray-400 text-sm">
              Out-nice your opponent. Get rated on sentiment, empathy, and wholesomeness by <span className="text-pink-300">Gemini</span>.
            </p>
          </div>
          <div className="mt-auto flex items-center gap-2 text-pink-400 text-sm font-bold uppercase tracking-wider">
            Start Kindness <Play size={16} />
          </div>
        </button>
      </div>

      <div className="mt-16 z-10 flex gap-8 text-gray-500 text-xs">
         <div className="flex flex-col items-center">
            <span className="font-bold text-gray-400">POWERED BY</span>
         </div>
         <div className="flex gap-4 items-center opacity-70">
            <span>GEMINI API</span>
            <span>•</span>
            <span>FEATHERLESS</span>
            <span>•</span>
            <span>K2 THINK</span>
            <span>•</span>
            <span>11LABS (Sim)</span>
         </div>
      </div>
    </div>
  );
};

export default MainMenu;