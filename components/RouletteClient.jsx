"use client";

import { useEffect, useState } from "react";
import { Wheel } from "react-custom-roulette";

export default function RouletteClient({ items, onComplete, shouldSpin }) {
  const [prizeIndex, setPrizeIndex] = useState(null);
  const [mustStartSpinning, setMustStartSpinning] = useState(false);
  const [winner, setWinner] = useState(null);
  const [ready, setReady] = useState(false); // ✅ 렌더링 조건 제어

  // ✅ items가 바뀌면 초기화 + index 설정
  useEffect(() => {
    if (
      Array.isArray(items) &&
      items.length > 0 &&
      items.every((item) => item && typeof item.option === "string")
    ) {
      const index = Math.floor(Math.random() * items.length);
      console.log("🎲 안전 index:", index);
      console.log("🧪 items[randomIndex]:", items[index]);

      setPrizeIndex(index);
      setWinner(null);
      setMustStartSpinning(false); // spin은 index 설정 후 별도 실행
      setReady(true); // ✅ 이 타이밍에만 Wheel 렌더링 허용
    } else {
      setReady(false); // 유효하지 않으면 렌더링 막기
    }
  }, [items]);

  // ✅ index가 설정된 후에만 돌리기
  useEffect(() => {
    if (
      ready &&
      typeof prizeIndex === "number" &&
      prizeIndex >= 0 &&
      prizeIndex < items.length
    ) {
      setMustStartSpinning(true);
    }
  }, [ready, prizeIndex]);

  // ✅ 에러 방지 조건
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

  {/* 🎯 실제 룰렛은 위에 덮음 */}
  <div className="relative z-20">
    <Wheel
      mustStartSpinning={shouldSpin} // ✅ 외부 트리거로 조정
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
      spinDuration={1}
      onStopSpinning={() => {
        const selected = items[prizeIndex]?.option;
        console.log("🎉 룰렛 종료! 당첨자:", selected);
        setWinner(selected);
        setMustStartSpinning(false);
        if (onComplete) onComplete(selected);
    }}
    />
  </div>
</div>

  );
}
