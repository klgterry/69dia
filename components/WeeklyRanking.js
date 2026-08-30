// components/WeeklyRanking.js
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import LoadError from "@/components/LoadError";

export default function WeeklyRanking() {
  const [wins, setWins] = useState([]);
  const [streaks, setStreaks] = useState([]);
  const [duos, setDuos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    async function fetchAll() {
      setIsLoading(true);
      setError(null);
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
  
        const sortedWins = assignRanks([...winsData].sort((a, b) => b.WINS - a.WINS), "WINS");
        const sortedStreaks = assignRanks([...streaksData].sort((a, b) => b.STREAK - a.STREAK), "STREAK");
        const sortedDuos = assignRanks([...duosData].sort((a, b) => b.WINS - a.WINS), "WINS");
  
        setWins(sortedWins);
        setStreaks(sortedStreaks);
        setDuos(sortedDuos);
      } catch (err) {
        console.error("❌ 주간 랭킹 데이터 로딩 실패:", err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAll();
  }, [reloadKey]);
  

  function assignRanks(data, key = "WINS") {
    let rank = 1;
    return data.map((item, index, arr) => {
      if (index > 0 && arr[index - 1][key] === item[key]) {
        item.rank = arr[index - 1].rank; // 이전과 점수 같으면 같은 랭크
      } else {
        item.rank = rank;
      }
      rank++;
      return item;
    });
  }
  
  

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
      ) : error ? (
        <div className="flex h-full items-center justify-center">
          <LoadError
            message="주간 랭킹을 불러오지 못했습니다."
            onRetry={() => setReloadKey((k) => k + 1)}
          />
        </div>
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
                    <td>{getBadge(win.rank) ? (
                    <div className="relative w-5 h-5 mx-auto">
                        <Image src={getBadge(win.rank)} alt="badge" fill className="object-contain" />
                    </div>
                    ) : win.rank}</td>
                    <td>{win && renderUserCell(win.PLAYER, win.rank)}</td>
                    <td className={`text-left pr-6 ${getTextClass(win.rank)}`}>{win?.WINS}</td>

                    {/* 🔥 연승 - 첫 컬럼에 세로선 추가 */}
                    <td className="pl-8 border-l-4 border-gray-400">{getBadge(streak.rank) ? (
                    <div className="relative w-5 h-5 mx-auto pl-8">
                        <Image src={getBadge(streak.rank)} alt="badge" fill className="object-contain" />
                    </div>
                    ) : streak.rank}</td>
                    <td>{streak && renderUserCell(streak.PLAYER, streak.rank)}</td>
                    <td className={`text-left pr-6 ${getTextClass(streak.rank)}`}>{streak?.STREAK}</td>

                    {/* 👥 듀오 승 - 첫 컬럼에 세로선 추가 */}
                    <td className="pl-8 border-l-4 border-gray-400">{getBadge(duo.rank) ? (
                    <div className="relative w-5 h-5 mx-auto pl-8">
                        <Image src={getBadge(duo.rank)} alt="badge" fill className="object-contain" />
                    </div>
                    ) : duo.rank}</td>
                    <td>{duo && renderDuoCell(duo.DUO, duo.rank)}</td>
                    <td className={`text-left ${getTextClass(duo.rank)}`}>{duo?.WINS}</td>
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