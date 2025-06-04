"use client";

import { useEffect, useRef, useState } from "react";
import { Wheel } from "react-custom-roulette";

export default function RouletteClient({ items, onComplete, shouldSpin, winAudioRef }) {
  const [prizeIndex, setPrizeIndex] = useState(null);
  const [mustStartSpinning, setMustStartSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [ready, setReady] = useState(false);

  const spinAudioRef = useRef(null);

  // ✅ 아이템이 유효할 때 초기화
  useEffect(() => {
    if (
      Array.isArray(items) &&
      items.length > 0 &&
      items.every((item) => item && typeof item.option === "string")
    ) {
      const index = Math.floor(Math.random() * items.length);
      setPrizeIndex(index);
      setWinner(null);
      setMustStartSpinning(false);
      setReady(true);
    } else {
      setReady(false);
    }
  }, [items]);

  // ✅ 외부에서 shouldSpin이 true일 때만 회전 시작
  useEffect(() => {
    if (
      shouldSpin &&
      ready &&
      typeof prizeIndex === "number" &&
      prizeIndex >= 0 &&
      prizeIndex < items.length
    ) {
      // 🎵 효과음 재생
      spinAudioRef.current?.play().catch((e) =>
        console.warn("🔇 회전 소리 재생 실패:", e)
      );
      setMustStartSpinning(true);
    }
  }, [shouldSpin]);

  const isValid =
    ready &&
    Array.isArray(items) &&
    typeof prizeIndex === "number" &&
    prizeIndex >= 0 &&
    prizeIndex < items.length &&
    typeof items[prizeIndex]?.option === "string";

  if (!items || items.length === 0 || !isValid) {
    return (
      <div className="w-full h-[500px] flex items-center justify-center text-gray-400 text-sm">
        ⚠️ 룰렛을 준비 중입니다...
      </div>
    );
  }

  return (
    <div className="relative w-full h-[500px] flex items-center justify-center">
      {/* 🎵 사운드 */}
      <audio ref={spinAudioRef} src="/sfx/spin_r.mp3" preload="auto" loop />
      <audio ref={winAudioRef} src="/sfx/win.mp3" preload="auto" />

      {/* 🎯 룰렛 */}
      <div className="relative z-20">
        <Wheel
          mustStartSpinning={mustStartSpinning}
          prizeNumber={prizeIndex}
          data={items}
          backgroundColors={["#1e90ff", "#ff6347", "#32cd32", "#ffa500"]}
          textColors={["#fff"]}
          fontSize={26}
          textDistance={75}
          outerBorderColor="#fff"
          outerBorderWidth={6}
          radiusLineColor="#ddd"
          radiusLineWidth={1}
          spinDuration={0.8}
          onStopSpinning={() => {
            const selected = items[prizeIndex]?.option;
            console.log("🎉 룰렛 종료! 당첨자:", selected);
            setWinner(selected);
            setMustStartSpinning(false);

            // 🔇 회전 사운드 정지
            if (spinAudioRef.current) {
              spinAudioRef.current.pause();
              spinAudioRef.current.currentTime = 0;
            }

            // 🥁 당첨 사운드
            winAudioRef.current?.play().catch((e) =>
              console.warn("🔇 당첨 소리 재생 실패:", e)
            );

            if (onComplete) onComplete(selected);
          }}
        />
      </div>
    </div>
  );
}
