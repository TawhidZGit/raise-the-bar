import React, { useState, useEffect, useRef } from 'react';
import { GameMode, TurnState, PlayerStats, RoundData } from '../types';
import { getRandomWords, TOTAL_ROUNDS } from '../constants';
import { Mic, MicOff, RefreshCw, Trophy, Home } from 'lucide-react';
import BarMeter from './BarMeter';
import Visualizer from './Visualizer';
import { audioService } from '../services/audioService';
import { calculateScore } from '../services/scoringService';

interface GameScreenProps {
  mode: GameMode;
  onExit: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ mode, onExit }) => {
  const [turnState, setTurnState] = useState<TurnState>(TurnState.INTRO);
  const [round, setRound] = useState(1);
  const [currentWords, setCurrentWords] = useState<string[]>([]);
  const [p1Stats, setP1Stats] = useState<PlayerStats>({ score: 0, history: [], lastTranscription: "", lastAnalysis: "" });
  const [p2Stats, setP2Stats] = useState<PlayerStats>({ score: 0, history: [], lastTranscription: "", lastAnalysis: "" });
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  
  // Audio Recognition Refs
  const recognitionRef = useRef<any>(null);

  // Colors based on mode
  const p1Color = mode === GameMode.BATTLE ? 'purple' : 'pink';
  const p2Color = mode === GameMode.BATTLE ? 'green' : 'cyan';
  const themeColor = mode === GameMode.BATTLE ? 'text-purple-400' : 'text-pink-400';

  // --- Effects ---

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          interimTranscript += event.results[i][0].transcript;
        }
        setTranscript(interimTranscript);
      };
    }

    startRound();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Game Logic ---

  const startRound = () => {
    setCurrentWords(getRandomWords(mode));
    setTurnState(TurnState.INTRO);
    setTimeout(() => {
        setTurnState(TurnState.P1_READY);
        audioService.playSnare();
    }, 2000);
  };

  const handleStartRecording = (player: 1 | 2) => {
    setTranscript("");
    setIsListening(true);
    audioService.playKick();
    
    if (recognitionRef.current) {
        try {
            recognitionRef.current.start();
        } catch(e) { console.error(e); }
    }

    setTurnState(player === 1 ? TurnState.P1_RECORDING : TurnState.P2_RECORDING);
  };

  const handleStopRecording = async (player: 1 | 2) => {
    setIsListening(false);
    audioService.playSnare();
    
    if (recognitionRef.current) {
        try {
            recognitionRef.current.stop();
        } catch(e) { console.error(e); }
    }

    setTurnState(player === 1 ? TurnState.P1_PROCESSING : TurnState.P2_PROCESSING);

    // Analyze Score
    const analysis = await calculateScore(transcript || "No audio detected", currentWords, mode);

    if (player === 1) {
        setP1Stats(prev => ({
            ...prev,
            score: Math.min(100, prev.score + (analysis.score / TOTAL_ROUNDS)),
            history: [...prev.history, analysis.score],
            lastTranscription: transcript || "(No input detected)",
            lastAnalysis: analysis.reasoning
        }));
        setTimeout(() => setTurnState(TurnState.P2_READY), 3000);
    } else {
        setP2Stats(prev => ({
            ...prev,
            score: Math.min(100, prev.score + (analysis.score / TOTAL_ROUNDS)),
            history: [...prev.history, analysis.score],
            lastTranscription: transcript || "(No input detected)",
            lastAnalysis: analysis.reasoning
        }));
        
        // End of round logic
        setTimeout(() => {
            if (round < TOTAL_ROUNDS) {
                setRound(r => r + 1);
                startRound();
            } else {
                setTurnState(TurnState.ROUND_END);
                audioService.playWin();
            }
        }, 3000);
    }
  };

  // --- Render Helpers ---

  const renderWords = () => (
    <div className="grid grid-cols-2 gap-4 my-6 w-full max-w-md">
      {currentWords.map((word, i) => (
        <div 
          key={i} 
          className={`bg-gray-800/50 border border-white/10 rounded-lg p-3 text-center text-xl font-bold tracking-wider animate-float`}
          style={{ animationDelay: `${i * 0.2}s` }}
        >
          {word.toUpperCase()}
        </div>
      ))}
    </div>
  );

  const renderCenterControl = () => {
    switch (turnState) {
      case TurnState.INTRO:
        return <div className="text-4xl font-bangers animate-bounce">ROUND {round}</div>;
      
      case TurnState.P1_READY:
        return (
          <button 
            onClick={() => handleStartRecording(1)}
            className={`bg-${p1Color}-600 hover:bg-${p1Color}-500 text-white rounded-full p-8 transition-transform hover:scale-110 shadow-[0_0_30px_rgba(168,85,247,0.6)]`}
          >
            <Mic size={48} />
            <span className="block text-sm font-bold mt-2">P1 SPIT</span>
          </button>
        );

      case TurnState.P1_RECORDING:
        return (
          <div className="flex flex-col items-center gap-4">
             <div className={`text-${p1Color}-400 font-bold animate-pulse`}>PLAYER 1 RECORDING...</div>
             <button 
                onClick={() => handleStopRecording(1)}
                className="bg-red-600 hover:bg-red-500 text-white rounded-full p-6"
             >
                <MicOff size={32} />
             </button>
          </div>
        );

      case TurnState.P1_PROCESSING:
      case TurnState.P2_PROCESSING:
         return (
             <div className="flex flex-col items-center">
                 <RefreshCw className="animate-spin mb-2 text-yellow-400" size={48} />
                 <span className="text-xs font-mono text-gray-400">ANALYZING W/ FEATHERLESS...</span>
                 <span className="text-xs font-mono text-gray-400">SCORING W/ GEMINI...</span>
             </div>
         );

      case TurnState.P2_READY:
        return (
            <button 
              onClick={() => handleStartRecording(2)}
              className={`bg-${p2Color}-600 hover:bg-${p2Color}-500 text-white rounded-full p-8 transition-transform hover:scale-110 shadow-[0_0_30px_rgba(34,197,94,0.6)]`}
            >
              <Mic size={48} />
              <span className="block text-sm font-bold mt-2">P2 SPIT</span>
            </button>
          );
  
      case TurnState.P2_RECORDING:
        return (
            <div className="flex flex-col items-center gap-4">
               <div className={`text-${p2Color}-400 font-bold animate-pulse`}>PLAYER 2 RECORDING...</div>
               <button 
                  onClick={() => handleStopRecording(2)}
                  className="bg-red-600 hover:bg-red-500 text-white rounded-full p-6"
               >
                  <MicOff size={32} />
               </button>
            </div>
          );

      case TurnState.ROUND_END:
        return (
            <div className="text-center">
                <Trophy size={64} className="text-yellow-400 mx-auto mb-4 animate-bounce" />
                <h2 className="text-3xl font-bangers mb-4">GAME OVER</h2>
                <button onClick={onExit} className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg font-bold">
                    MAIN MENU
                </button>
            </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen relative bg-black">
        {/* Background Overlay */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1596464716127-f2a82984de30?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 pointer-events-none" />

        {/* Top Header */}
        <div className="z-10 w-full flex justify-between items-center p-4 bg-black/40 backdrop-blur-sm border-b border-white/10">
            <button onClick={onExit} className="text-gray-400 hover:text-white"><Home /></button>
            <h1 className={`font-graffiti text-2xl ${themeColor}`}>
                {mode === GameMode.BATTLE ? "STREET BATTLE" : "KILL 'EM W/ KINDNESS"}
            </h1>
            <div className="text-gray-400 font-mono text-sm">Round {round}/{TOTAL_ROUNDS}</div>
        </div>

        {/* Main Battle Arena */}
        <div className="z-10 flex-1 flex flex-col md:flex-row items-stretch justify-center p-4 gap-4 overflow-hidden">
            
            {/* Player 1 Section */}
            <div className="flex-1 flex flex-col items-center justify-start p-4 bg-gray-900/50 rounded-2xl border border-white/5 transition-colors duration-500" style={{ borderColor: turnState.includes('P1') ? 'rgba(168,85,247,0.5)' : 'transparent' }}>
                <BarMeter 
                    score={p1Stats.score} 
                    label="P1" 
                    color={p1Color} 
                    side="left" 
                    isActive={turnState.includes('P1')} 
                />
                <div className="mt-4 w-full h-32 bg-black/50 rounded p-2 overflow-y-auto text-xs font-mono text-gray-300 border border-white/10">
                    <span className="text-purple-500 font-bold block mb-1">LAST BAR:</span>
                    {p1Stats.lastTranscription || "Waiting..."}
                    <div className="mt-2 text-yellow-500 italic border-t border-white/10 pt-1">
                        AI: {p1Stats.lastAnalysis}
                    </div>
                </div>
            </div>

            {/* Center Stage */}
            <div className="flex-[2] flex flex-col items-center justify-center relative">
                
                {/* Visualizer Area */}
                <div className="w-full mb-8">
                    <Visualizer 
                        isListening={isListening} 
                        color={turnState.includes('P1') ? '#a855f7' : '#22c55e'} 
                    />
                </div>

                {/* Dynamic Words Display */}
                {renderWords()}

                {/* Action Button/Status */}
                <div className="my-8">
                    {renderCenterControl()}
                </div>

                {/* Live Transcript View (only when recording) */}
                {isListening && (
                    <div className="absolute bottom-0 w-full bg-black/80 p-4 text-center rounded-xl backdrop-blur border border-white/20">
                        <p className="text-lg font-mono animate-pulse">{transcript || "Listening..."}</p>
                    </div>
                )}
            </div>

            {/* Player 2 Section */}
            <div className="flex-1 flex flex-col items-center justify-start p-4 bg-gray-900/50 rounded-2xl border border-white/5 transition-colors duration-500" style={{ borderColor: turnState.includes('P2') ? 'rgba(34,197,94,0.5)' : 'transparent' }}>
                <BarMeter 
                    score={p2Stats.score} 
                    label="P2" 
                    color={p2Color} 
                    side="right" 
                    isActive={turnState.includes('P2')} 
                />
                <div className="mt-4 w-full h-32 bg-black/50 rounded p-2 overflow-y-auto text-xs font-mono text-gray-300 border border-white/10">
                    <span className="text-green-500 font-bold block mb-1">LAST BAR:</span>
                    {p2Stats.lastTranscription || "Waiting..."}
                    <div className="mt-2 text-yellow-500 italic border-t border-white/10 pt-1">
                        AI: {p2Stats.lastAnalysis}
                    </div>
                </div>
            </div>

        </div>
    </div>
  );
};

export default GameScreen;