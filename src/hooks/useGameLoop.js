import { useEffect, useRef } from 'react';

export function useGameLoop(callback, isPlaying) {
  const requestRef = useRef();
  const previousTimeRef = useRef();

  const animate = (time) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      callback(deltaTime); // Gọi hàm update logic game
    }
    previousTimeRef.current = time;
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
    
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying]); // Chạy lại hook nếu trạng thái isPlaying thay đổi
}