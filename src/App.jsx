import { useState } from 'react';
import MainMenu from './components/MainMenu';
import GameOver from './components/GameOver';
import HUD from './components/HUD';
import GameCanvas from './components/GameCanvas'; // Import file Canvas vừa tạo

function App() {
  const [gameState, setGameState] = useState('menu'); 
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(3);

  const startGame = () => {
    setScore(0);
    setHp(3);
    setGameState('playing');
  };

  const triggerGameOver = () => {
    setGameState('gameover');
  };

  return (
    <div className="w-screen h-screen relative bg-slate-900 overflow-hidden">
      
      {/* 1. Màn hình Menu */}
      {gameState === 'menu' && <MainMenu onStart={startGame} />}

      {/* 2. Màn hình lúc đang chơi */}
      {gameState === 'playing' && (
        <>
          <HUD score={score} hp={hp} />
          
          {/* Tuần 2: Nơi vẽ đồ họa của Game */}
          <GameCanvas 
            onGameOver={triggerGameOver}
            score={score}
            setScore={setScore}
            hp={hp}
            setHp={setHp}
          />
        </>
      )}

      {/* 3. Màn hình Game Over */}
      {gameState === 'gameover' && (
        <GameOver score={score} onRestart={startGame} />
      )}

    </div>
  );
}

export default App;