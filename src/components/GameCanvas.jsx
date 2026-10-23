import React, { useEffect, useRef, useState } from 'react';

export default function GameCanvas({ onGameOver, score, setScore, hp, setHp }) {
  const canvasRef = useRef(null);
  const scoreRef = useRef(score);
  
  // Khai báo biến quản lý trạng thái Tạm dừng
  const [isPaused, setIsPaused] = useState(false);
  const pausedRef = useRef(false); 

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
    const bossImg = new Image(); bossImg.src = '/boss.png'; // [MỚI] Hình Boss
    const shootSound = new Audio('/shoot.mp3');
    const explodeSound = new Audio('/explode.mp3');

    // [MỚI] Bầu trời sao cuộn (Parallax)
    let stars = Array.from({ length: 100 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2 + 1,
      speed: Math.random() * 3 + 1
    }));

    // [MỚI] Thêm hasShield vào player
    let player = { x: canvas.width / 2 - 75, y: canvas.height - 150, width: 150, height: 150, speed: 7, hasShield: false };
    let bullets = []; let enemies = []; let particles = []; let powerUps = [];
    let bossBullets = []; // [MỚI] Mảng đạn của Boss
    let multiShotEndTime = 0; 
    let keys = {};

    // [MỚI] Thông số Boss
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
        shootSound.currentTime = 0; shootSound.play();
      }
    };

    const handleKeyUp = (e) => { keys[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Sinh Kẻ địch
    const enemyTimer = setInterval(() => {
      if (pausedRef.current || boss.active) return; // [MỚI] Không sinh kẻ địch nếu đang Pause hoặc có Boss
      
      const currentScore = scoreRef.current;
      const difficultyMultiplier = 2.5 + (currentScore / 3000); 
      enemies.push({
        x: Math.random() * (canvas.width - 120), y: -120, width: 120, height: 120, 
        speed: (1.5 + Math.random() * 1) * difficultyMultiplier,
      });
    }, 1000);

    // Sinh Vật phẩm
    const powerUpTimer = setInterval(() => {
      if (pausedRef.current) return; 
      // [MỚI] 50% ra đạn chùm (P), 50% ra Khiên (S)
      const type = Math.random() > 0.5 ? 'P' : 'S';
      powerUps.push({ x: Math.random() * (canvas.width - 40), y: -40, width: 40, height: 40, speed: 4, type });
    }, 10000);

    // [MỚI] Boss bắn đạn (1.5 giây 1 lần)
    const bossShootTimer = setInterval(() => {
      if (pausedRef.current || !boss.active || boss.y < 0) return;
      bossBullets.push({ x: boss.x + boss.width / 2 - 10, y: boss.y + boss.height, width: 20, height: 40, speed: 8 });
    }, 1500);

    let animationFrameId;

    const update = () => {
      // Chỉ cập nhật logic và vẽ khi KHÔNG bị tạm dừng
      if (!pausedRef.current) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // [MỚI] Vẽ bầu trời sao
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

        // [MỚI] Vẽ Khiên bảo vệ nếu đang có khiên
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
            ctx.fillStyle = pu.type === 'P' ? '#10b981' : '#3b82f6'; 
            ctx.fillRect(pu.x, pu.y, pu.width, pu.height);
            ctx.fillStyle = 'white'; ctx.font = 'bold 24px Arial'; 
            ctx.fillText(pu.type, pu.x + 12, pu.y + 28);

            if (
              player.x < pu.x + pu.width && player.x + player.width > pu.x &&
              player.y < pu.y + pu.height && player.y + player.height > pu.y
            ) {
              powerUps.splice(puIndex, 1); 
              if (pu.type === 'P') multiShotEndTime = Date.now() + 5000; 
              if (pu.type === 'S') player.hasShield = true; // [MỚI] Bật khiên
            }
          }
        });

        //  Hàm xử lý mất máu (Kiểm tra xem có khiên không)
        const takeDamage = () => {
          if (player.hasShield) { 
            player.hasShield = false; // Mất khiên thay vì mất máu
          } else { 
            setHp((prev) => { if (prev <= 1) { onGameOver(); return 0; } return prev - 1; }); 
          }
        };

        // 5. Cập nhật Kẻ địch
        enemies.forEach((enemy, eIndex) => {
          enemy.y += enemy.speed;
          if (enemy.y > canvas.height) {
            enemies.splice(eIndex, 1);
            takeDamage(); // [MỚI] Gọi hàm xử lý mất máu
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
              setScore((prev) => prev + 100);
              explodeSound.currentTime = 0; explodeSound.play();
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
              explodeSound.currentTime = 0; explodeSound.play();
              
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
      clearInterval(enemyTimer); 
      clearInterval(powerUpTimer);
      clearInterval(bossShootTimer); // [MỚI] Dọn dẹp timer của Boss
      cancelAnimationFrame(animationFrameId);
    };
  }, []);


  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className={`block w-full h-full ${isPaused ? 'cursor-default' : 'cursor-none'}`} />
      
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
                onGameOver(); // Chuyển thẳng về màn hình thua để nhấn chơi lại
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