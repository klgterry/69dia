"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import LoadError from "@/components/LoadError";

// 클래스명 매핑
const classIconMap = {
  "드": "druid",
  "어": "oracle",
  "넥": "necro",
  "슴": "summoner",
};

// GAS API에서 게임 이력 불러오기
async function fetchGameHistory() {
  const response = await fetch("/api/gasApi?action=getGameHistory");
  if (!response.ok) throw new Error("Failed to fetch game history");
  const data = await response.json();
  return data.games || [];
}

export default function UserFullHistory({ selectedUser }) {
  const [filteredGames, setFilteredGames] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedUser) return;

    setError(null);
    fetchGameHistory()
      .then((games) => {
        const normalizedUser = selectedUser.trim().toLowerCase();

        const userGames = games.filter((game) => {
          const winners = game.winningPlayers.map((p) =>
            p.username.trim().toLowerCase()
          );
          const losers = game.losingPlayers.map((p) =>
            p.username.trim().toLowerCase()
          );
          return winners.includes(normalizedUser) || losers.includes(normalizedUser);
        });

        const sortedGames = userGames.sort((a, b) => {
          const dateA = new Date(a.DATETIME || 0);
          const dateB = new Date(b.DATETIME || 0);
          return dateB - dateA || b.gameId - a.gameId;
        });

        setFilteredGames(sortedGames.slice(0, 6));
      })
      .catch((err) => {
        console.error("❌ 유저 게임 이력 불러오기 실패", err);
        setError(err);
      });
  }, [selectedUser]);

  if (!selectedUser) return null;

  return (
    <div
      className="relative w-[824px] h-[400px] bg-center bg-no-repeat p-6 rounded-lg mx-auto mt-10"
      style={{
        backgroundImage: "url('/icons/bg/recent_games_bg.png')",
        backgroundSize: "824px 400px",
      }}
    >
      <h3 className="text-xl font-bold text-white mb-4 text-center drop-shadow-sm mt-3">
        📜 <span className="text-yellow-300">{selectedUser}</span>의 최근 경기 상세
      </h3>

      {error && (
        <LoadError message="최근 경기를 불러오지 못했습니다." />
      )}

      <div className="relative w-[780px] h-[100px] mx-auto mt-6">

        {/* ✅ NEW 라인 오버레이 */}
        <div className="absolute top-[5px] w-[824px] left-0 w-full h-[40px] z-30 pointer-events-none">
          <Image
            src="/icons/bg/new_line.png"
            alt="NEW 라인"
            width={780}      // 원하는 가로 폭
            height={32}      // 원하는 세로 높이
          />
        </div>
        {/* ✅ 테이블 전체 박스 (UserFullHistory) */}
        <div className="absolute inset-0 z-10 -mt-2">
          <table className="w-full border-collapse border border-gray-700 text-center text-sm bg-transparent">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="p-2 text-white">승리 팀</th>
                <th className="p-2 text-white">VS</th>
                <th className="p-2 text-white">패배 팀</th>
              </tr>
            </thead>
            <tbody>
              {filteredGames.map((game, idx) => (
                <tr key={game.gameId} className="border-b border-gray-700">
                  <td className={`p-2 pl-4 ${idx === 0 ? "relative z-20" : ""}`}>
                    {/* 승리팀 */}
                    <div className="flex gap-1 items-center">
                      {game.winningPlayers.map((player) => (
                        <div key={player.username} className="flex items-center gap-1 w-[80px]">
                          <div className="relative w-5 h-5 shrink-0">
                            <Image
                              src={`/icons/classes/${classIconMap[player.class]}.jpg`}
                              alt={player.class}
                              fill
                              className="object-contain"
                            />
                          </div>
                          <span
                            className={`text-sm whitespace-nowrap ${
                              player.username === selectedUser
                                ? "font-bold underline text-green-300"
                                : "text-white"
                            }`}
                          >
                            {player.username}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-2 font-bold text-white">VS</td>
                  <td className={`p-2 pl-4 ${idx === 0 ? "relative z-20" : ""}`}>
                    {/* 패배팀 */}
                    <div className="flex gap-1 items-center">
                      {game.losingPlayers.map((player) => (
                        <div key={player.username} className="flex items-center gap-1 w-[80px]">
                          <div className="relative w-5 h-5 shrink-0">
                            <Image
                              src={`/icons/classes/${classIconMap[player.class]}.jpg`}
                              alt={player.class}
                              fill
                              className="object-contain"
                            />
                          </div>
                          <span
                            className={`text-sm whitespace-nowrap ${
                              player.username === selectedUser
                                ? "font-bold underline text-red-300"
                                : "text-white"
                            }`}
                          >
                            {player.username}
                          </span>
                        </div>
                      ))}
                      
                    </div>
                    
                  </td>
                </tr>
              ))}
            </tbody> 
          </table>
          {/* ✅ 하단 그라데이션 */}
          <div className="left-0 w-full -mt-20 h-[20px] z-20 pointer-events-none">
            <Image
              src="/icons/bg/gradient.png"
              alt="하단 그라데이션"
              width={780}
              height={20}
              className="object-cover opacity-90"
            />
          </div>
         </div>
      </div>
    </div>
  );
}
