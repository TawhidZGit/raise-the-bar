import React, { useState } from 'react';
import MainMenu from './components/MainMenu';
import GameScreen from './components/GameScreen';
import { GameMode, GameState } from '../../../Downloads/raise-the-bar-UI/types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [selectedMode, setSelectedMode] = useState<GameMode>(GameMode.BATTLE);

  const handleStartGame = (mode: GameMode) => {
    setSelectedMode(mode);
    setGameState(GameState.GAME_LOOP);
  };

  const handleExitGame = () => {
    setGameState(GameState.MENU);
  };

  return (
    <div className="w-full h-screen bg-[#0f0f0f] text-white overflow-hidden">
      {gameState === GameState.MENU && (
        <MainMenu onStart={handleStartGame} />
      )}
      
      {gameState === GameState.GAME_LOOP && (
        <GameScreen 
          mode={selectedMode} 
          onExit={handleExitGame} 
        />
      )}
    </div>
  );
};

export default App;