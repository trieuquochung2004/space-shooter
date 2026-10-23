export default function GameOver({ score, onRestart }) {
  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen bg-black/80 absolute top-0 left-0 z-10">
      <h2 className="text-6xl font-bold text-red-500 mb-4">GAME OVER</h2>
      <p className="text-2xl mb-8">Điểm số của bạn: <span className="text-yellow-400">{score}</span></p>
      <button 
        onClick={onRestart}
        className="px-8 py-3 bg-white text-black hover:bg-gray-200 rounded text-xl font-bold transition-all"
      >
        CHƠI LẠI
      </button>
    </div>
  );
}