"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

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

  useEffect(() => {
    if (!selectedUser) return;

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

        setFilteredGames(sortedGames.slice(0, 5));
      })
      .catch((err) => {
        console.error("❌ 유저 게임 이력 불러오기 실패", err);
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
      <h3 className="text-xl font-bold text-white mb-4 text-center drop-shadow-sm mt-2">
        📜 <span className="text-yellow-300">{selectedUser}</span>의 최근 5경기 상세
      </h3>

      <table className="w-full border-collapse border border-gray-700 text-center text-sm bg-transparent">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="p-2 text-white">승리 팀</th>
            <th className="p-2 text-white">VS</th>
            <th className="p-2 text-white">패배 팀</th>
          </tr>
        </thead>
        <tbody>
          {filteredGames.length > 0 ? (
            filteredGames.map((game, idx) => (
              <tr key={game.gameId} className="border-b border-gray-700">
                {/* 승리 팀 */}
                <td className={`p-2 ${idx === 0 ? "pl-1" : "pl-10"}`}>
                  <div className={`flex gap-1 ${idx === 0 ? "items-center" : "items-start"}`}>
                    {/* 🆕 최신 경기 표시 */}
                    {idx === 0 && (
                      <span className="ml-1 px-1 py-0.5 text-[10px] bg-yellow-400 text-black rounded-sm font-bold">
                        NEW
                      </span>
                    )}

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

                {/* VS */}
                <td className="p-2 font-bold text-white">VS</td>

                {/* 패배 팀 */}
                <td className="p-2 pl-5">
                  <div className="flex gap-1 items-start">
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
            ))
          ) : (
            <tr>
              <td colSpan="4" className="p-4 text-gray-400 text-center">
                🕓 경기 기록이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
