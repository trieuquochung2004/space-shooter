export default function MainMenu({ onStart }) {
  return (
    <div className="flex flex-col items-center justify-center w-screen h-screen bg-slate-900 absolute top-0 left-0 z-10">
      <h1 className="text-5xl font-bold text-blue-400 mb-8 tracking-widest uppercase">Space Shooter</h1>
      <button 
        onClick={onStart}
        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 rounded text-xl font-bold transition-all shadow-[0_0_15px_rgba(37,99,235,0.5)]"
      >
        BẮT ĐẦU CHƠI
      </button>
      <p className="mt-6 text-gray-400">Dùng WASD hoặc Phím mũi tên để di chuyển. Space để bắn.</p>
    </div>
  );
}