"use client"; // ✅ 클라이언트 컴포넌트로 명시

import { useState } from "react";
import Image from "next/image";
import { useRouter } from 'next/navigation';

const classOptions = [
  { name: "드루이드", key: "druid", url: "https://blog.naver.com/lovlince/222848167249" },
  { name: "어쌔신", key: "assassin", url: "https://blog.naver.com/lovlince/222927332795" },
  { name: "네크로맨서", key: "necromancer", url: "https://blog.naver.com/lovlince/222797460895" },
  { name: "팔라딘", key: "paladin", url: "https://blog.naver.com/lovlince/222848170589" },
];



export default function SettingPage() {
  const [selected, setSelected] = useState(null);
  const router = useRouter(); // ✅ router 객체 생성

  const handleClick = (key) => {
    setSelected((prev) => (prev === key ? null : key)); // 토글 선택
  };

  const handleClassClick = (key, url) => {
    setSelected(key); // 🔘 눌린 상태 표시

    const audio = new Audio("/sfx/class_open.mp3");
    audio.play();
  
    setTimeout(() => {
      setSelected(null);        // ✅ 원래대로 복귀
      window.open(url, "_blank"); // 🔗 그 다음 외부 링크 이동
    }, 300); // 0.3초 정도 눌린 상태 유지
  };
  

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* 네비게이션 바 */}
      <nav className="flex justify-start items-center space-x-6 bg-gray-800 p-2 rounded-lg shadow-md text-lg font-bold tracking-widest pl-4">
        {/* 로고 */}
        <div className="relative w-12 h-12">
          <Image src="/icons/logo.png" alt="Logo" fill className="object-contain" />
        </div>

        {/* 네비게이션 버튼 */}
        {[
          { name: "home", path: "/" },
          { name: "history", path: "/history" },
          { name: "user", path: "/user" },
          { name: "rule", path: "/rule" },
          { name: "setting", path: "/setting" }, // Ready 버튼 추가
          { name: "ready", path: "/ready" } // Ready 버튼 추가
        ].map(({ name, path }) => (
          <button
            key={name}
            onClick={() => {
              if (path === "/ready" || path === "/" || path === "/rule" || path === "/setting") {
                router.push(path); // ✅ 실제로 이동
              } else {
                alert("준비 중입니다."); // ✅ 알림만
              }
            }}
            className="w-28 h-8 flex items-center justify-center md:w-36 md:h-10"
            style={{
              backgroundImage: `url('/icons/nav/${name}.png')`,
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundImage = `url('/icons/nav/${name}_hover.png')`}
            onMouseLeave={(e) => e.currentTarget.style.backgroundImage = `url('/icons/nav/${name}.png')`}
          />
        ))}
      </nav>
    {/* ✅ 패널을 수직 중앙에 배치하기 위한 flex-grow 영역 */}
    <div className="flex flex-1 items-center justify-center mt-20">
      <div
        className="w-[512px] h-[384px] relative flex items-center justify-center"
        style={{
          backgroundImage: "url('/bg_setting.png')",
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
        }}
      >
        <div className="grid grid-cols-2 gap-4">
            {classOptions.map(({ name, key, url }) => {
              const isSelected = selected === key;
              return (
                <button
                  key={key}
                  onClick={() => handleClassClick(key, url)} // ✅ 이름 변경
                  className="relative w-[180px] h-[50px] p-0"
                >
                  <Image
                    src={
                      isSelected
                        ? `/btn_${key}_pressed.png`
                        : `/btn_${key}.png`
                    }
                    alt={name}
                    fill
                    className="object-contain"
                  />
                </button>
              );
            })}
          </div>
      </div>
    </div>
    </div>
  );
}
