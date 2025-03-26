// components/Slot.js
"use client";

import { useEffect, useState, useRef } from "react";

export default function Slot({ nameList, finalName, delay = 0, duration = 2000 }) {
  const [currentName, setCurrentName] = useState("");
  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // 🎵 효과음 준비
    audioRef.current = new Audio("/sfx/spin.mp3");
    audioRef.current.loop = true;
    audioRef.current.volume = 0.6;

    // 1. 돌리기 시작
    intervalRef.current = setInterval(() => {
      const randomName = nameList[Math.floor(Math.random() * nameList.length)] || "?";
      setCurrentName(randomName);
    }, 200);

    // ⏳ 효과음 + 딜레이 시작
    const startTimeout = setTimeout(() => {
      audioRef.current.play().catch(err => console.warn("🎵 효과음 재생 실패:", err));
    }, delay);

    // 2. 일정 시간 후 멈추고 최종 이름 표시
    timeoutRef.current = setTimeout(() => {
      clearInterval(intervalRef.current);
      setCurrentName(finalName);

      // 🔇 효과음 멈춤
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }, delay + duration);

    // 🧼 정리
    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(startTimeout);
      clearTimeout(timeoutRef.current);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [nameList, finalName, delay, duration]);

  return (
    <div className="p-1 bg-opacity-100 w-18 h-10 flex items-center justify-center">
      {currentName || "..."}
    </div>
  );
}
