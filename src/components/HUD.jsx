export default function HUD({ score, hp }) {
  return (
    <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none z-10">
      <div className="text-2xl font-bold text-white drop-shadow-md">
        Điểm: <span className="text-yellow-400">{score}</span>
      </div>
      <div className="text-2xl font-bold flex gap-2">
        Máu: 
        {/* Render thanh máu đơn giản bằng các ô màu đỏ */}
        {[...Array(hp)].map((_, i) => (
          <div key={i} className="w-6 h-6 bg-red-500 rounded-sm shadow-[0_0_10px_red]"></div>
        ))}
      </div>
    </div>
  );
}