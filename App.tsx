import React, { useState, useEffect } from 'react';
import { Overworld } from './components/Overworld/Overworld';
import { BattleEngine } from './components/Battle/BattleEngine';
import { FloweyIntro } from './components/Cutscenes/FloweyIntro';
import { Box } from './components/UI/Box';
import { GameMode, PlayerStats } from './types';
import { INITIAL_STATS } from './constants';
import { Typewriter } from './components/UI/Typewriter';

const App: React.FC = () => {
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.START_SCREEN);
  const [currentRoom, setCurrentRoom] = useState('start');
  const [playerStats, setPlayerStats] = useState<PlayerStats>(INITIAL_STATS);
  const [playerPos, setPlayerPos] = useState({ x: 300, y: 200 });
  const [transitioning, setTransitioning] = useState(false);
  const [flash, setFlash] = useState(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [showSaveScreen, setShowSaveScreen] = useState(false);
  
  // Puzzle State
  const [puzzleFlags, setPuzzleFlags] = useState<Record<string, boolean>>({});

  // Play audio dummy (required for Chrome autoplay policies usually)
  const initAudio = () => {
     if (!audioStarted) {
         setAudioStarted(true);
         setGameMode(GameMode.OVERWORLD);
     }
  };

  const handleEncounter = () => {
      setFlash(true); // Flash effect
      // Sound effect would go here
      setTimeout(() => {
          setFlash(false);
          setGameMode(GameMode.BATTLE);
      }, 500);
  };

  const handleWin = () => {
      setPlayerStats(prev => ({ ...prev, gold: prev.gold + 20, exp: prev.exp + 10 }));
      setGameMode(GameMode.OVERWORLD);
  };

  const handleLose = () => {
      setGameMode(GameMode.GAME_OVER);
  };

  const handleRoomChange = (roomId: string, x: number, y: number) => {
      if (roomId === 'flowey_room' && !playerStats.items.includes('flowey_met')) {
           // First time meeting Flowey
           setTransitioning(true);
           setTimeout(() => {
               setGameMode(GameMode.FLOWEY_CUTSCENE);
               setTransitioning(false);
           }, 200);
           return;
      }

      setTransitioning(true);
      setTimeout(() => {
          setCurrentRoom(roomId);
          setPlayerPos({ x, y });
          setTransitioning(false);
      }, 200); // Small black fade
  };

  const updateStats = (newStats: Partial<PlayerStats>) => {
      setPlayerStats(prev => ({ ...prev, ...newStats }));
  };

  const handleSave = () => {
      setShowSaveScreen(true);
  };

  const confirmSave = () => {
      setPlayerStats(prev => ({ ...prev, hp: prev.maxHp }));
      setShowSaveScreen(false);
  };

  const finishFlowey = () => {
      setPlayerStats(prev => ({ ...prev, items: [...prev.items, 'flowey_met'] }));
      setGameMode(GameMode.OVERWORLD);
      // Move to hallway immediately after cutscene
      setCurrentRoom('ruins_entrance'); 
      setPlayerPos({ x: 60, y: 180 });
  };
  
  const handlePuzzleUpdate = (flag: string, val: boolean) => {
      setPuzzleFlags(prev => ({ ...prev, [flag]: val }));
  };

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center font-sans">
      <div className="relative w-[640px] h-[480px] bg-black">
        
        {/* Global Flash Effect for Encounter */}
        {flash && (
            <div className="absolute inset-0 bg-black z-50 animate-pulse">
                <div className="w-full h-full bg-white opacity-50"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-red-500 text-6xl">❤</span>
                </div>
            </div>
        )}

        {/* Room Transition Curtain */}
        {transitioning && <div className="absolute inset-0 bg-black z-40"></div>}

        {gameMode === GameMode.START_SCREEN && (
            <div className="w-full h-full flex flex-col items-center justify-center text-white" onClick={initAudio}>
                <h1 className="font-8bit text-4xl mb-8 text-center text-gray-300">UNDERTALE<br/><span className="text-sm">Web Remake</span></h1>
                <p className="font-dialogue text-xl animate-pulse text-yellow-200">[ НАЖМИТЕ Z ИЛИ КЛИКНИТЕ ]</p>
                <div className="mt-20 text-gray-500 font-dialogue text-center">
                    Управление: Стрелки - Движение<br/>
                    Z / Enter - Действие
                </div>
            </div>
        )}

        {gameMode === GameMode.FLOWEY_CUTSCENE && (
            <FloweyIntro onComplete={finishFlowey} />
        )}

        {gameMode === GameMode.OVERWORLD && (
            <>
                <Overworld 
                    currentRoomId={currentRoom}
                    onChangeRoom={handleRoomChange}
                    onEncounter={handleEncounter}
                    onSave={handleSave}
                    initialPos={playerPos}
                    puzzleFlags={puzzleFlags}
                    onPuzzleUpdate={handlePuzzleUpdate}
                />
                
                {/* Save Screen Overlay */}
                {showSaveScreen && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50">
                        <Box className="w-[400px] h-[200px] bg-black">
                            <div className="p-6 font-dialogue text-3xl flex flex-col justify-between h-full">
                                <div>
                                    <div className="flex justify-between mb-4">
                                        <span>{playerStats.name}</span>
                                        <span>LV {playerStats.lv}</span>
                                    </div>
                                    <div className="text-2xl mb-2">Руины</div>
                                </div>
                                <div className="flex justify-between mt-4">
                                     <span className="cursor-pointer text-yellow-400 hover:text-white" onClick={confirmSave}>❤ Сохранить</span>
                                     <span className="cursor-pointer hover:text-yellow-400" onClick={() => setShowSaveScreen(false)}>Вернуться</span>
                                </div>
                            </div>
                        </Box>
                    </div>
                )}
            </>
        )}

        {gameMode === GameMode.BATTLE && (
            <BattleEngine 
                onWin={handleWin}
                onLose={handleLose}
                playerStats={playerStats}
                updateStats={updateStats}
            />
        )}

        {gameMode === GameMode.GAME_OVER && (
            <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white">
                <div className="w-1/2 text-center">
                    <Typewriter 
                        className="text-4xl mb-4 text-white block" 
                        text="РЕШИМОСТЬ." 
                        speed={100}
                    />
                    <p className="font-dialogue text-gray-400 mt-4">Ты не можешь сдаться сейчас...</p>
                    <p className="font-dialogue text-gray-400">Фриск! Оставайся решительным!</p>
                    
                    <button 
                        className="mt-8 font-8bit text-yellow-400 hover:text-yellow-200 text-sm"
                        onClick={() => {
                            setPlayerStats(INITIAL_STATS);
                            setCurrentRoom('start');
                            setPlayerPos({ x: 300, y: 200 });
                            setGameMode(GameMode.OVERWORLD);
                        }}
                    >
                        [ ПОПРОБОВАТЬ СНОВА ]
                    </button>
                </div>
            </div>
        )}
        
        {/* Scanline Overlay for retro feel */}
        <div className="scanlines pointer-events-none"></div>
      </div>
    </div>
  );
};

export default App;