'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// GAS API에서 규칙 데이터 가져오기
async function fetchRules() {
  const response = await fetch("/api/gasApi?action=getRules");
  if (!response.ok) {
    throw new Error("Failed to fetch rules");
  }
  const data = await response.json();
  console.log("📜 가져온 규칙 데이터:", data); // ✅ 데이터 확인
  return data;
}

export default function RulePage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchRules()
      .then((data) => {
        setRules(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });
  }, []);

  if (error) {
    return <div>Error: {error}</div>;  // 에러가 발생한 경우
  }

  // 규칙을 카테고리별로 묶기
  const groupedRules = rules.reduce((acc, rule) => {
    if (rule.category.startsWith("[") || rule.category.startsWith("※")) {
      acc.push({
        category: rule.category,
        rules: []
      });
    } else {
      // 카테고리 마지막에 해당하는 규칙을 추가
      if (acc.length > 0) {
        acc[acc.length - 1].rules.push(rule.category);
      }
    }
    return acc;
  }, []);

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
      
      {/* 규칙 영역 */}
      <div className="mt-8 bg-gray-800 p-8 rounded-lg max-w-3xl mx-auto overflow-x-auto">
            <h2 className="text-center text-xl font-semibold">📜 게임 규칙</h2>

            {/* 두 열로 나누기 */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-8">
                {/* 첫 번째 열 */}
                <div>
                {groupedRules.slice(0, Math.ceil(groupedRules.length / 2)).map((group, index) => (
                    <div key={index} className="bg-gray-700 p-4 rounded-lg mt-4">
                    <h3 className="text-lg font-bold text-yellow-400">{group.category}</h3>
                    <div className="mt-2 space-y-2">
                        {group.rules.map((rule, idx) => (
                        <p key={idx} className="text-base">{rule}</p>
                        ))}
                    </div>
                    </div>
                ))}
                </div>

                {/* 두 번째 열 */}
                <div>
                {groupedRules.slice(Math.ceil(groupedRules.length / 2)).map((group, index) => (
                    <div key={index} className="bg-gray-700 p-4 rounded-lg mt-4">
                    <h3 className="text-lg font-bold text-yellow-400">{group.category}</h3>
                    <div className="mt-2 space-y-2">
                        {group.rules.map((rule, idx) => (
                        <p key={idx} className="text-base">{rule}</p>
                        ))}
                    </div>
                    </div>
                ))}
                </div>
            </div>

        </div>
      {/* 로딩 상태 표시 */}
      {loading && (
        <div className="text-center text-xl text-gray-300 mt-6">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-t-4 border-gray-600 border-solid rounded-full"></div>
          <p>로딩 중...</p>
        </div>
      )}
    </div>
  );
}
