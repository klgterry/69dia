"use client"; // ✅ 클라이언트 컴포넌트로 명시

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from 'next/navigation';

async function fetchRules() {
  const res = await fetch("/api/gasApi?action=getRules");
  if (!res.ok) throw new Error("Failed to fetch rules");
  return res.json();
}

function RulePanel() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchRules()
      .then((data) => setRules(data))
      .catch((err) => setError(err.message ?? "Unknown error"))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div className="bg-red-900/30 border border-red-500 text-red-200 p-4 rounded-lg mt-8 max-w-3xl mx-auto">
        Error: {error}
      </div>
    );
  }

  // 카테고리 단위로 묶기
  const groupedRules = rules.reduce((acc, rule) => {
    if (
      typeof rule.category === "string" &&
      (rule.category.startsWith("[") || rule.category.startsWith("※"))
    ) {
      acc.push({ category: rule.category, rules: [] });
    } else {
      if (acc.length > 0) acc[acc.length - 1].rules.push(rule.category);
    }
    return acc;
  }, []);

  return (
    <section className="mt-16">
      <div className="bg-gray-800 p-8 rounded-lg max-w-3xl mx-auto overflow-x-auto">
        <h2 className="text-center text-xl font-semibold">📜 게임 규칙</h2>

        {loading ? (
          <div className="text-center text-xl text-gray-300 mt-6">
            <div className="animate-spin inline-block w-12 h-12 border-4 border-t-4 border-gray-600 border-solid rounded-full" />
            <p className="mt-2">로딩 중...</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-8">
            {/* 좌측 */}
            <div>
              {groupedRules.slice(0, Math.ceil(groupedRules.length / 2)).map((group, i) => (
                <div key={`left-${i}`} className="bg-gray-700 p-4 rounded-lg mt-4">
                  <h3 className="text-lg font-bold text-yellow-400">{group.category}</h3>
                  <div className="mt-2 space-y-2">
                    {group.rules.map((r, idx) => (
                      <p key={idx} className="text-base">
                        {r}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {/* 우측 */}
            <div>
              {groupedRules.slice(Math.ceil(groupedRules.length / 2)).map((group, i) => (
                <div key={`right-${i}`} className="bg-gray-700 p-4 rounded-lg mt-4">
                  <h3 className="text-lg font-bold text-yellow-400">{group.category}</h3>
                  <div className="mt-2 space-y-2">
                    {group.rules.map((r, idx) => (
                      <p key={idx} className="text-base">
                        {r}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const classOptions = [
  { name: "드루이드", key: "druid", url: "https://blog.naver.com/lovlince/222848167249" },
  { name: "어쌔신", key: "assassin", url: "https://blog.naver.com/lovlince/222927332795" },
  { name: "네크로맨서", key: "necromancer", url: "https://blog.naver.com/lovlince/222797460895" },
  { name: "팔라딘", key: "paladin", url: "https://blog.naver.com/lovlince/222848170589" },
];

export default function SettingPage() {
  const [selected, setSelected] = useState(null);
  const router = useRouter(); // ✅ router 객체 생성
  const [hovered, setHovered] = useState(null);

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
          //{ name: "rule", path: "/rule" },
          { name: "week", path: "/week" },
          { name: "setting", path: "/setting" },
          { name: "user", path: "/user" },
          { name: "history", path: "/history" },
          { name: "ready", path: "/ready" },
          { name: "prize", path: "/prize" }
        ].map(({ name, path }) => (
          <button
            key={name}
            onClick={() => {
              router.push(path); // ✅ 실제로 이동
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
    <div className="mt-12 flex flex-col items-center">
  {/* 타이틀 */}
  <h1 className="text-4xl font-serif tracking-wide mb-10">PK setting</h1>

  {/* 버튼 행 */}
  <div className="w-full max-w-4xl flex flex-wrap items-center justify-center gap-8 px-6 overflow-visible">
    {classOptions.map(({ name, key, url }) => {
      const isSelected = selected === key;
      const src =
        isSelected
          ? `/btn_${key}_pressed.png`
          : hovered === key
          ? `/btn_${key}.png` // 없으면 기본으로 표시됨
          : `/btn_${key}.png`;

      return (
        <button
          key={key}
          onClick={() => handleClassClick(key, url)}
          onMouseEnter={() => setHovered(key)}
          onMouseLeave={() => setHovered(null)}
          className="relative block"
          style={{ width: 160, height: 48 }}
          aria-label={name}
          title={name}
        >
          <Image
            src={src}
            alt={name}
            fill
            className="object-contain"
            sizes="160px"
          />
        </button>
      );
    })}
  </div>
</div>
    {/* 하단: 규칙 패널 */}
      <RulePanel />
    </div>
  );
}
