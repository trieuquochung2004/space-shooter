import React, { useEffect, useRef, useState } from 'react';

export default function GameCanvas({ onGameOver, score, setScore, hp, setHp }) {
  const canvasRef = useRef(null);
  const scoreRef = useRef(score);
  
  // Khai báo biến quản lý trạng thái Tạm dừng
  const [isPaused, setIsPaused] = useState(false);
  const pausedRef = useRef(false); 

  // [TASK 15] Khai báo state lưu Điểm cao nhất từ localStorage
  const [bestScore, setBestScore] = useState(() => {
    return parseInt(localStorage.getItem('space_shooter_bestScore')) || 0;
  });

  // [TASK 17] Tính toán Level hiện tại để hiển thị ra UI (Cứ 1000 điểm lên 1 Level)
  const currentLevel = Math.floor(score / 1000) + 1;
  
  // Dùng ref để lưu trữ phím bấm chung cho cả bàn phím và màn hình cảm ứng
  const keysRef = useRef({});

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const shipImg = new Image(); shipImg.src = '/ship.png'; 
    const enemyImg = new Image(); enemyImg.src = '/enemy.png'; 
    const bossImg = new Image(); bossImg.src = '/boss.png';
    const shootSound = new Audio('/shoot.mp3');
    const explodeSound = new Audio('/explode.mp3');

    // Bầu trời sao cuộn (Parallax)
    let stars = Array.from({ length: 100 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2 + 1,
      speed: Math.random() * 3 + 1
    }));

    // Thêm hasShield vào player
    let player = { x: canvas.width / 2 - 75, y: canvas.height - 150, width: 150, height: 150, speed: 7, hasShield: false };
    let bullets = []; let enemies = []; let particles = []; let powerUps = [];
    let bossBullets = []; 
    let multiShotEndTime = 0; 
    let doubleScoreEndTime = 0; // [TASK 19] Biến lưu thời gian hiệu lực x2 điểm
    let keys = keysRef.current; 

    let boss = { active: false, isDead: false, x: canvas.width / 2 - 150, y: -300, width: 300, height: 300, hp: 50, maxHp: 50, speedX: 3, speedY: 1 };
    
    const handleKeyDown = (e) => {
      // Xử lý phím P để tạm dừng
      if (e.key === 'p' || e.key === 'P') {
        pausedRef.current = !pausedRef.current;
        setIsPaused(pausedRef.current);
        return; // Dừng lại, không quét các phím khác
      }

      // Nếu đang tạm dừng thì chặn không cho bắn hay di chuyển
      if (pausedRef.current) return;

      keys[e.key] = true;
      if (e.key === ' ' || e.key === 'Spacebar') {
        const isMulti = Date.now() < multiShotEndTime;
        bullets.push({ x: player.x + player.width / 2 - 3, y: player.y, width: 6, height: 15, speed: 10, vx: 0 });
        if (isMulti) {
          bullets.push({ x: player.x + player.width / 2 - 3, y: player.y, width: 6, height: 15, speed: 10, vx: -3 }); 
          bullets.push({ x: player.x + player.width / 2 - 3, y: player.y, width: 6, height: 15, speed: 10, vx: 3 }); 
        }
        shootSound.currentTime = 0; shootSound.play().catch(e => console.log("Audio play error", e));
      }
    };

    const handleKeyUp = (e) => { keys[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // ==========================================
    // [TASK 16 + 17] HỆ THỐNG SINH KẺ ĐỊCH THEO LEVEL
    // ==========================================
    let enemySpawnTimeout;
    const spawnEnemy = () => {
      if (!pausedRef.current && !boss.active) {
        const currentScore = scoreRef.current;
        const level = Math.floor(currentScore / 1000) + 1; 
        const difficultyMultiplier = 1 + (currentScore / 3000); 

        // CHỌN LOẠI KẺ ĐỊCH (NORMAL, FAST, ZIGZAG)
        let eType = 'normal';
        let randomVal = Math.random();
        
        // Level 2 trở lên: 30% ra địch tốc độ cao
        if (level >= 2 && randomVal > 0.7) eType = 'fast'; 
        // Level 3 trở lên: 15% ra địch bay lượn lách
        if (level >= 3 && randomVal > 0.85) eType = 'zigzag'; 

        enemies.push({
          x: Math.random() * (canvas.width - 120), 
          y: -120, 
          width: 120, 
          height: 120, 
          // Địch fast bay nhanh gấp đôi, địch zigzag bay vừa
          speed: (eType === 'fast' ? 4 : 2) + Math.random() * difficultyMultiplier,
          type: eType // Gắn mác loại địch
        });
      }

      // Rút ngắn thời gian sinh địch khi level cao (Tối thiểu 400ms)
      const currentLevelData = Math.floor(scoreRef.current / 1000) + 1;
      const nextSpawnTime = Math.max(400, 1500 - (currentLevelData * 150)); 
      
      enemySpawnTimeout = setTimeout(spawnEnemy, nextSpawnTime);
    };
    
    // Kích hoạt vòng lặp sinh địch lần đầu
    spawnEnemy();

    // Sinh Vật phẩm
    const powerUpTimer = setInterval(() => {
      if (pausedRef.current) return; 
      // [TASK 19] Bổ sung thêm Vật phẩm Hồi máu (H) và Nhân đôi điểm (X)
      const types = ['P', 'S', 'H', 'X']; 
      const type = types[Math.floor(Math.random() * types.length)];
      powerUps.push({ x: Math.random() * (canvas.width - 40), y: -40, width: 40, height: 40, speed: 4, type });
    }, 8000); // Rớt vật phẩm nhanh hơn một chút (8 giây/lần)

    // Boss bắn đạn (1.5 giây 1 lần)
    const bossShootTimer = setInterval(() => {
      if (pausedRef.current || !boss.active || boss.y < 0) return;
      bossBullets.push({ x: boss.x + boss.width / 2 - 10, y: boss.y + boss.height, width: 20, height: 40, speed: 8 });
    }, 1500);

    let animationFrameId;

    const update = () => {
      // Chỉ cập nhật logic và vẽ khi KHÔNG bị tạm dừng
      if (!pausedRef.current) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Vẽ bầu trời sao
        ctx.fillStyle = 'white';
        stars.forEach(star => {
          star.y += star.speed;
          if (star.y > canvas.height) { star.y = 0; star.x = Math.random() * canvas.width; }
          ctx.beginPath(); ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2); ctx.fill();
        });

        // 1. Cập nhật Người chơi
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) player.x -= player.speed;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) player.x += player.speed;
        if (keys['ArrowUp'] || keys['w'] || keys['W']) player.y -= player.speed;
        if (keys['ArrowDown'] || keys['s'] || keys['S']) player.y += player.speed;

        if (player.x < 0) player.x = 0;
        if (player.x > canvas.width - player.width) player.x = canvas.width - player.width;
        if (player.y < 0) player.y = 0;
        if (player.y > canvas.height - player.height) player.y = canvas.height - player.height;

        ctx.drawImage(shipImg, player.x, player.y, player.width, player.height);

        // Vẽ Khiên bảo vệ nếu đang có khiên
        if (player.hasShield) {
          ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 4;
          ctx.beginPath(); 
          ctx.arc(player.x + player.width/2, player.y + player.height/2, player.width/2 + 20, 0, Math.PI * 2); 
          ctx.stroke();
        }

        // 2. Cập nhật Đạn
        bullets.forEach((bullet, index) => {
          bullet.y -= bullet.speed; bullet.x += bullet.vx; 
          if (bullet.y < 0 || bullet.x < 0 || bullet.x > canvas.width) bullets.splice(index, 1);
          else {
            ctx.fillStyle = '#facc15'; ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
          }
        });

        // 3. Cập nhật Hiệu ứng nổ
        particles.forEach((p, pIndex) => {
          p.x += p.vx; p.y += p.vy; p.life -= 0.04; 
          if (p.life <= 0) particles.splice(pIndex, 1);
          else {
            ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, p.size, p.size); ctx.globalAlpha = 1.0; 
          }
        });

        // 4. Cập nhật Vật phẩm
        powerUps.forEach((pu, puIndex) => {
          pu.y += pu.speed;
          if (pu.y > canvas.height) powerUps.splice(puIndex, 1);
          else {
            // Đổi màu cho sinh động (H: Đỏ hồng, X: Cam, P: Xanh lá, S: Xanh dương)
            if (pu.type === 'H') ctx.fillStyle = '#ec4899';
            else if (pu.type === 'X') ctx.fillStyle = '#f97316';
            else if (pu.type === 'P') ctx.fillStyle = '#10b981';
            else ctx.fillStyle = '#3b82f6'; 

            ctx.fillRect(pu.x, pu.y, pu.width, pu.height);
            ctx.fillStyle = 'white'; ctx.font = 'bold 24px Arial'; 
            ctx.fillText(pu.type, pu.x + 12, pu.y + 28);

            if (
              player.x < pu.x + pu.width && player.x + player.width > pu.x &&
              player.y < pu.y + pu.height && player.y + player.height > pu.y
            ) {
              powerUps.splice(puIndex, 1); 
              if (pu.type === 'P') multiShotEndTime = Date.now() + 5000; 
              if (pu.type === 'S') player.hasShield = true; 
              // [TASK 19] Kích hoạt tác dụng cho vật phẩm mới
              if (pu.type === 'H') setHp(prev => Math.min(prev + 1, 3)); // Hồi 1 máu (tối đa 3)
              if (pu.type === 'X') doubleScoreEndTime = Date.now() + 8000; // x2 điểm trong 8 giây
            }
          }
        });

        // Hàm xử lý mất máu (Kiểm tra xem có khiên không)
        const takeDamage = () => {
          if (player.hasShield) { 
            player.hasShield = false; // Mất khiên thay vì mất máu
          } else { 
            setHp((prev) => { 
              if (prev <= 1) { 
                // [TASK 15] Kiểm tra và lưu điểm cao nhất trước khi kết thúc game
                if (scoreRef.current > bestScore) {
                  setBestScore(scoreRef.current);
                  localStorage.setItem('space_shooter_bestScore', scoreRef.current);
                }
                onGameOver(); 
                return 0; 
              } 
              return prev - 1; 
            }); 
          }
        };

        // 5. Cập nhật Kẻ địch
        enemies.forEach((enemy, eIndex) => {
          enemy.y += enemy.speed;

          // ==========================================
          // [TASK 16] XỬ LÝ QUỸ ĐẠO BAY CỦA ĐỊCH ZIGZAG
          // ==========================================
          if (enemy.type === 'zigzag') {
            enemy.x += Math.sin(enemy.y / 30) * 6; 
            if (enemy.x < 0) enemy.x = 0;
            if (enemy.x > canvas.width - enemy.width) enemy.x = canvas.width - enemy.width;
          }

          if (enemy.y > canvas.height) {
            enemies.splice(eIndex, 1);
            takeDamage(); 
          }

          bullets.forEach((bullet, bIndex) => {
            if (
              bullet.x < enemy.x + enemy.width && bullet.x + bullet.width > enemy.x &&
              bullet.y < enemy.y + enemy.height && bullet.y + bullet.height > enemy.y
            ) {
              for (let i = 0; i < 8; i++) {
                particles.push({
                  x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2,
                  vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
                  life: 1, size: Math.random() * 4 + 2, color: '#ef4444' 
                });
              }
              bullets.splice(bIndex, 1); enemies.splice(eIndex, 1);
              
              // [TASK 19] Kiểm tra nếu đang có hiệu lực x2 Điểm
              const isDoubleScore = Date.now() < doubleScoreEndTime;
              setScore((prev) => prev + (isDoubleScore ? 200 : 100));
              
              explodeSound.currentTime = 0; explodeSound.play().catch(e => console.log(e));
            }
          });

          ctx.drawImage(enemyImg, enemy.x, enemy.y, enemy.width, enemy.height);
        });

        // 6. XỬ LÝ BOSS
        if (scoreRef.current >= 1000 && !boss.active && !boss.isDead) { 
          boss.active = true; 
          enemies = []; // Xóa hết lính lác
        }

        if (boss.active) {
          if (boss.y < 50) boss.y += boss.speedY; // Boss từ từ bay xuống
          else { 
            boss.x += boss.speedX; 
            if (boss.x <= 0 || boss.x + boss.width >= canvas.width) boss.speedX *= -1; // Đụng tường dội lại
          } 

          ctx.drawImage(bossImg, boss.x, boss.y, boss.width, boss.height);
          
          // Vẽ thanh máu Boss
          ctx.fillStyle = 'red'; ctx.fillRect(boss.x, boss.y - 20, boss.width, 10);
          ctx.fillStyle = 'green'; ctx.fillRect(boss.x, boss.y - 20, (boss.hp / boss.maxHp) * boss.width, 10);

          // Xử lý đạn người chơi bắn trúng Boss
          bullets.forEach((bullet, bIndex) => {
            if ( bullet.x < boss.x + boss.width && bullet.x + bullet.width > boss.x && bullet.y < boss.y + boss.height && bullet.y + bullet.height > boss.y ) {
              bullets.splice(bIndex, 1); 
              boss.hp -= 1;
              explodeSound.currentTime = 0; explodeSound.play().catch(e => console.log(e));
              
              if (boss.hp <= 0) {
                boss.active = false; boss.isDead = true; setScore(prev => prev + 5000);
                // Nổ siêu to khổng lồ
                for (let i=0; i<30; i++) particles.push({ x: boss.x + boss.width/2, y: boss.y + boss.height/2, vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15, life: 1, size: Math.random()*8+4, color: '#ffeb3b' });
              }
            }
          });
        }

        // Cập nhật đạn của Boss
        bossBullets.forEach((bb, bbIndex) => {
          bb.y += bb.speed;
          if (bb.y > canvas.height) bossBullets.splice(bbIndex, 1);
          else {
            ctx.fillStyle = '#ef4444'; ctx.fillRect(bb.x, bb.y, bb.width, bb.height);
            // Xử lý đạn Boss trúng Người chơi
            if ( bb.x < player.x + player.width && bb.x + bb.width > player.x && bb.y < player.y + player.height && bb.y + bb.height > player.y ) {
              bossBullets.splice(bbIndex, 1); 
              takeDamage(); // Gọi hàm mất máu/mất khiên
            }
          }
        });
      }

      animationFrameId = requestAnimationFrame(update);
    };

    animationFrameId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearTimeout(enemySpawnTimeout); 
      clearInterval(powerUpTimer);
      clearInterval(bossShootTimer); 
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // [TASK 18] Hàm xử lý phím bắn cho Mobile (kích hoạt âm thanh & đạn)
  const handleMobileShoot = () => {
    if (pausedRef.current) return;
    
    // Tạm thời kích hoạt phím cách rồi nhả ra ngay lập tức
    keysRef.current[' '] = true;
    
    // Kích hoạt sự kiện bấm phím space
    const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
    window.dispatchEvent(spaceEvent);
    
    setTimeout(() => {
      keysRef.current[' '] = false;
    }, 100);
  };

  return (
    <div className="relative w-full h-full overflow-hidden touch-none">
      <canvas ref={canvasRef} className={`block w-full h-full ${isPaused ? 'cursor-default' : 'cursor-none'}`} />
      
      {/* [TASK 15] Hiển thị Điểm cao nhất ở góc dưới bên trái */}
      <div className="absolute bottom-4 left-4 text-white text-xl font-bold bg-black/50 px-4 py-2 rounded-lg border border-gray-600 hidden md:block z-10">
        Best Score: <span className="text-yellow-400">{bestScore}</span>
      </div>

      {/* [TASK 17] GIAO DIỆN HIỂN THỊ LEVEL */}
      <div className="absolute top-16 right-10 text-white text-3xl font-bold font-mono tracking-wider drop-shadow-md z-10">
        Level: <span className="text-blue-400">{currentLevel}</span>
      </div>

      {/* [TASK 18] BỘ ĐIỀU KHIỂN MOBILE (Chỉ hiện trên màn hình nhỏ) */}
      <div className="absolute bottom-10 left-6 flex gap-4 md:hidden z-40 opacity-60">
        <button 
          onTouchStart={(e) => { e.preventDefault(); keysRef.current['ArrowLeft'] = true; }} 
          onTouchEnd={(e) => { e.preventDefault(); keysRef.current['ArrowLeft'] = false; }}
          onMouseDown={() => { keysRef.current['ArrowLeft'] = true; }} 
          onMouseUp={() => { keysRef.current['ArrowLeft'] = false; }}
          className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full text-white text-3xl font-bold border-2 border-white/50 flex items-center justify-center select-none active:bg-white/50"
        >
          ⬅
        </button>
        <button 
          onTouchStart={(e) => { e.preventDefault(); keysRef.current['ArrowRight'] = true; }} 
          onTouchEnd={(e) => { e.preventDefault(); keysRef.current['ArrowRight'] = false; }}
          onMouseDown={() => { keysRef.current['ArrowRight'] = true; }} 
          onMouseUp={() => { keysRef.current['ArrowRight'] = false; }}
          className="w-16 h-16 bg-white/30 backdrop-blur-sm rounded-full text-white text-3xl font-bold border-2 border-white/50 flex items-center justify-center select-none active:bg-white/50"
        >
          ➡
        </button>
      </div>
      
      <div className="absolute bottom-10 right-6 md:hidden z-40 opacity-80">
        <button 
          onTouchStart={(e) => { e.preventDefault(); handleMobileShoot(); }} 
          onMouseDown={handleMobileShoot}
          className="w-20 h-20 bg-red-600/70 backdrop-blur-sm rounded-full text-white text-xl font-bold border-4 border-red-400 flex items-center justify-center select-none active:bg-red-500/90 shadow-[0_0_15px_rgba(239,68,68,0.5)]"
        >
          BẮN
        </button>
      </div>

      {isPaused && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-50">
          <h2 className="text-white text-6xl font-bold mb-10 tracking-widest text-blue-400 drop-shadow-lg">TẠM DỪNG</h2>
          <div className="flex gap-6">
            <button 
              onClick={() => {
                pausedRef.current = false;
                setIsPaused(false);
              }}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xl transition-all border-2 border-blue-400 hover:scale-105"
            >
              TIẾP TỤC
            </button>
            <button 
              onClick={() => {
                pausedRef.current = false;
                setIsPaused(false);
                onGameOver(); 
              }}
              className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xl transition-all border-2 border-red-400 hover:scale-105"
            >
              CHƠI LẠI
            </button>
          </div>
          <p className="text-gray-400 mt-8 text-lg animate-pulse">Nhấn P để tiếp tục nhanh</p>
        </div>
      )}
    </div>
  );
}