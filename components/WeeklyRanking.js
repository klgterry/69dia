// components/WeeklyRanking.js
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function WeeklyRanking() {
  const [wins, setWins] = useState([]);
  const [streaks, setStreaks] = useState([]);
  const [duos, setDuos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setIsLoading(true);
      try {
        const [winsRes, streaksRes, duosRes] = await Promise.all([
          fetch("/api/gasApi?action=getWeeklyRanking"),
          fetch("/api/gasApi?action=getWeeklyWinStreakRanking"),
          fetch("/api/gasApi?action=getWeeklyDuoRanking")
        ]);

        const [winsData, streaksData, duosData] = await Promise.all([
          winsRes.json(),
          streaksRes.json(),
          duosRes.json()
        ]);

        setWins(winsData);
        setStreaks(streaksData);
        setDuos(duosData);
      } catch (err) {
        console.error("❌ 주간 랭킹 데이터 로딩 실패:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAll();
  }, [])

  const getBadge = (rank) => {
    if (rank === 1) return "/icons/rank/1.png";
    if (rank === 2) return "/icons/rank/2.png";
    if (rank === 3) return "/icons/rank/3.png";
    return null;
  };

  const getTextClass = (rank) => {
    if (rank === 1) return "text-yellow-300 font-bold";
    if (rank === 2) return "text-yellow-300 font-bold";
    if (rank === 3) return "text-yellow-300 font-bold";
    return "text-white";
  };

  const Badge = ({ rank }) => (
    <div className="relative w-6 h-6 mx-auto">
      <Image src={getBadge(rank)} alt="badge" fill className="object-contain" />
    </div>
  );
  

  const renderUserCell = (username, rank) => {
    const trimmed = username?.trim();
    const imgSrc = trimmed ? `/icons/users/웹_${trimmed}.jpg` : "/icons/users/default.png";
    return (
      <div className="flex items-center gap-2">
        <div className="relative w-5 h-5 rounded overflow-hidden">
          <Image src={imgSrc} alt={trimmed} fill className="object-cover" onError={(e) => (e.currentTarget.src = "/icons/users/default.png")} />
        </div>
        <span className={`text-sm truncate w-[39px] text-left ${getTextClass(rank)}`}>{trimmed}</span>
      </div>
    );
  };

  const renderDuoCell = (duoString, rank) => {
    const [user1, user2] = duoString.split("&").map(u => u.trim());
    return (
      <div className="grid grid-cols-[auto_20px_auto] items-center gap-2">
        {/* 유저1 */}
        <div className="flex items-center gap-2">
          <div className="relative w-5 h-5 rounded overflow-hidden">
            <Image
              src={`/icons/users/웹_${user1}.jpg`}
              alt={user1}
              fill
              className="object-cover"
              onError={(e) => (e.currentTarget.src = "/icons/users/default.png")}
            />
          </div>
          <span className={`text-sm truncate w-[39px] text-left ${getTextClass(rank)}`}>{user1}</span>
        </div>
  
        {/* & 구분자 */}
        <span className="text-sm text-center">&</span>
  
        {/* 유저2 */}
        <div className="flex items-center gap-1">
          <div className="relative w-5 h-5 rounded overflow-hidden">
            <Image
              src={`/icons/users/웹_${user2}.jpg`}
              alt={user2}
              fill
              className="object-cover"
              onError={(e) => (e.currentTarget.src = "/icons/users/default.png")}
            />
          </div>
          <span className={`text-sm truncate w-[39px] text-left ${getTextClass(rank)}`}>{user2}</span>
        </div>
      </div>
    );
  }; 

  return (
    <div
      className="-mt-10 w-full max-w-[1200px] h-[800px] mx-auto px-4 text-white bg-[url('/icons/bg/fire_frame.png')] bg-no-repeat bg-center"
      style={{ backgroundSize: '100% 100%' }}
    >
      {isLoading ? (
        <p className="text-center text-gray-400 pb-10"></p>
      ) : (
        <div className="w-full overflow-x-auto">
          <table className={`table-auto w-[350px] h-[400px] mx-auto text-1xl text-left border-separate border-spacing-x-2 mt-65`}>
          <thead>
            <tr className="text-center text-2xl">
                <th colSpan={3}>🏆 승수</th>
                <th colSpan={3} className="pl-5 border-l-4 border-gray-400">🔥 연승</th>
                <th colSpan={3} className="border-l-4 border-gray-400">👥 듀오 승</th>
            </tr>
          </thead>
            <tbody>
            {Array.from({ length: 10 }).map((_, idx) => {
                const win = wins[idx];
                const streak = streaks[idx];
                const duo = duos[idx];
                return (
                <tr key={idx} className="text-center">
                    {/* 🏆 승수 */}
                    <td>{getBadge(idx + 1) ? (
                    <div className="relative w-5 h-5 mx-auto">
                        <Image src={getBadge(idx + 1)} alt="badge" fill className="object-contain" />
                    </div>
                    ) : idx + 1}</td>
                    <td>{win && renderUserCell(win.PLAYER, idx + 1)}</td>
                    <td className={`text-left pr-6 ${getTextClass(idx + 1)}`}>{win?.WINS}</td>

                    {/* 🔥 연승 - 첫 컬럼에 세로선 추가 */}
                    <td className="pl-8 border-l-4 border-gray-400">{getBadge(idx + 1) ? (
                    <div className="relative w-5 h-5 mx-auto pl-8">
                        <Image src={getBadge(idx + 1)} alt="badge" fill className="object-contain" />
                    </div>
                    ) : idx + 1}</td>
                    <td>{streak && renderUserCell(streak.PLAYER, idx + 1)}</td>
                    <td className={`text-left pr-6 ${getTextClass(idx + 1)}`}>{streak?.STREAK}</td>

                    {/* 👥 듀오 승 - 첫 컬럼에 세로선 추가 */}
                    <td className="pl-8 border-l-4 border-gray-400">{getBadge(idx + 1) ? (
                    <div className="relative w-5 h-5 mx-auto pl-8">
                        <Image src={getBadge(idx + 1)} alt="badge" fill className="object-contain" />
                    </div>
                    ) : idx + 1}</td>
                    <td>{duo && renderDuoCell(duo.DUO, idx + 1)}</td>
                    <td className={`text-left ${getTextClass(idx + 1)}`}>{duo?.WINS}</td>
                </tr>
                );
            })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}