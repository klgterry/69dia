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

// ✅ 최근 경기 이력 모듈 (배경 포함)
export default function UserFullHistory({ selectedUser }) {
  const [filteredGames, setFilteredGames] = useState([]);

  useEffect(() => {
    if (!selectedUser) return;
  
    fetchGameHistory()
      .then((games) => {
        console.log("✅ 전체 게임 수:", games.length);
  
        const normalizedUser = selectedUser.trim().toLowerCase();
  
        // 1️⃣ 유저가 참여한 경기만 필터링
        const userGames = games.filter(game => {
          const winners = game.winningPlayers.map(p => p.username.trim().toLowerCase());
          const losers = game.losingPlayers.map(p => p.username.trim().toLowerCase());
          return winners.includes(normalizedUser) || losers.includes(normalizedUser);
        });
  
        console.log(`🎯 [${selectedUser}] 포함된 경기 수: ${userGames.length}`);
  
        // 2️⃣ 유저 경기만 정렬 (최근 경기 순)
        const sortedGames = userGames.sort((a, b) => {
          // 날짜가 있다면 날짜 기준, 없다면 gameId 기준
          const dateA = new Date(a.DATETIME || 0);
          const dateB = new Date(b.DATETIME || 0);
          return dateB - dateA || b.gameId - a.gameId;
        });
  
        // 3️⃣ 상위 5개만 보여줌
        setFilteredGames(sortedGames.slice(0, 5));
  
        // ✅ 디버깅
        sortedGames.slice(0, 5).forEach((game, idx) => {
          console.log(
            `📌 ${idx + 1}. ${game.gameId} ⏰ ${game.DATETIME} ✅ ${game.winningPlayers.map(p => p.username)} ❌ ${game.losingPlayers.map(p => p.username)}`
          );
        });
      })
      .catch(err => {
        console.error("❌ 유저 게임 이력 불러오기 실패", err);
      });
  }, [selectedUser]);
  
  
  
  if (!selectedUser) return null;

  return (
    <div
        className="relative w-[824px] h-[400px] bg-center bg-no-repeat p-6 rounded-lg mx-auto mt-10"
        style={{
            backgroundImage: "url('/icons/bg/recent_games_bg.png')",
            backgroundSize: "824px 400px", // ✅ 너비와 높이를 명시
        }}
    >
      <h3 className="text-xl font-bold text-white mb-4 text-center drop-shadow-sm">
  📜 <span className="text-yellow-300">{selectedUser}</span>의 최근 5경기 상세
</h3>

      <table className="w-full border-collapse border border-gray-700 text-center text-sm bg-transparent">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="p-2 text-white">게임 번호</th>
            <th className="p-2 text-white">승리 팀</th>
            <th className="p-2 text-white">VS</th>
            <th className="p-2 text-white">패배 팀</th>
          </tr>
        </thead>
        <tbody>
          {filteredGames.length > 0 ? (
            filteredGames.map((game) => (
              <tr key={game.gameId} className="border-b border-gray-700">
                <td className="p-2 text-gray-200">{game.gameId}</td>
                <td className="p-2">
                  <TeamDisplay players={game.winningPlayers} selectedUser={selectedUser} isWinner />
                </td>
                <td className="p-2 font-bold text-white">VS</td>
                <td className="p-2">
                  <TeamDisplay players={game.losingPlayers} selectedUser={selectedUser} />
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="p-4 text-gray-400">🕓 경기 기록이 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ✅ 팀 표시용 컴포넌트
function TeamDisplay({ players, selectedUser, isWinner }) {
    return (
      <div className="flex flex-wrap justify-center gap-2">
        {players.map((player) => {
          const isSelected = player.username === selectedUser;
  
          return (
            <div key={player.username} className="flex items-center gap-1">
              <Image
                src={`/icons/classes/${classIconMap[player.class]}.jpg`}
                alt={player.class}
                width={24}
                height={24}
                className="object-cover"
              />
              <span
                className={`
                  ${isSelected ? "font-bold underline" : ""}
                  ${isSelected 
                    ? isWinner 
                      ? "text-green-300" 
                      : "text-red-300" 
                    : "text-white"
                  }
                `}
              >
                {player.username}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  
