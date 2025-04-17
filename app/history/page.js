"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

// 클래스명 매핑 (Main 페이지와 동일한 아이콘 파일명 사용)
const classIconMap = {
  "드": "druid",
  "어": "oracle",
  "넥": "necro",
  "슴": "summoner"
};

// GAS API에서 게임 이력 데이터 가져오기
async function fetchGameHistory() {
  const response = await fetch("/api/gasApi?action=getGameHistory");
  if (!response.ok) {
    throw new Error("Failed to fetch game history");
  }
  const data = await response.json();
  console.log("📜 가져온 게임 이력 데이터:", data); // ✅ 데이터 확인
  return data;
}

export default function HistoryPage() {
  const [gameHistory, setGameHistory] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetchGameHistory()
      .then((data) => {
        if (data.games) {
          setGameHistory(data.games.slice(0, 10)); // 🔥 최근 10개만 표시
        }
      })
      .catch((error) => console.error("Error fetching game history:", error));
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* 네비게이션 바 */}
      <nav className="flex justify-start items-center space-x-6 bg-gray-800 p-2 rounded-lg shadow-md text-lg font-bold tracking-widest pl-4">
                {/* 로고 */}
                <div className="relative w-12 h-12">
                <Image src="/icons/logo.png" alt="Logo" fill className="object-contain" />
                </div>
                
                {/* 네비게이션 버튼 */}
                {[
                  { name: "home", path: "/" },
                  { name: "rule", path: "/rule" },
                  { name: "setting", path: "/setting" },
                  { name: "user", path: "/user" },
                  { name: "history", path: "/history" },
                  { name: "ready", path: "/ready" }
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

      {/* 타이틀 영역 */}
      <div className="text-center mt-4">
        <h1 className="text-3xl font-bold">📜 게임 이력</h1>
        <p className="mt-2 text-gray-400">최근 10 경기 이력만 확인 가능합니다.</p>
      </div>

      {/* 게임 이력 테이블 */}
      <div className="mt-6 bg-gray-800 p-4 rounded-lg max-w-5xl mx-auto">
        <h2 className="text-center text-xl mb-4">📊 최근 게임 이력</h2>
        
        <table className="w-full mx-auto border-collapse border border-gray-700 text-center">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="p-2">게임 번호</th>
              <th className="p-2">승리 팀</th>
              <th className="p-2">VS</th>
              <th className="p-2">패배 팀</th>
            </tr>
          </thead>
          <tbody>
            {gameHistory.length > 0 ? (
              gameHistory.map((game) => (
                <tr key={game.gameId} className="border-b border-gray-700">
                  <td className="p-2 text-sm">{game.gameId}</td>
                  
                  {/* 승리 팀 */}
                  <td className="p-2">
                    <div className="flex flex-wrap justify-center gap-2">
                      {game.winningPlayers.map(player => (
                        <div key={player.username} className="flex items-center space-x-2">
                          <Image 
                            src={`/icons/classes/${classIconMap[player.class]}.jpg`} 
                            alt={player.class}
                            width={32}
                            height={32} 
                            className="w-8 h-8 object-cover rounded-none"
                          />
                          <span className="text-green-400 text-xs whitespace-nowrap">{player.username}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                  
                  {/* VS */}
                  <td className="p-2 font-bold text-white align-middle">VS</td>
                  
                  {/* 패배 팀 */}
                  <td className="p-2">
                    <div className="flex flex-wrap justify-center gap-2">
                      {game.losingPlayers.map(player => (
                        <div key={player.username} className="flex items-center space-x-2">
                          <Image 
                            src={`/icons/classes/${classIconMap[player.class]}.jpg`} 
                            alt={player.class}
                            width={32}
                            height={32} 
                            className="w-8 h-8 object-cover rounded-none"
                          />
                          <span className="text-red-400 text-xs whitespace-nowrap">{player.username}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center p-4">🚀 게임 이력을 불러오는 중...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
