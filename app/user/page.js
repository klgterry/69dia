"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

// ✅ GAS API 호출
async function fetchUserList() {
  const res = await fetch("/api/gasApi?action=getUsersAndAliases");
  const data = await res.json();
  return data;
}

async function fetchSeasonList() {
  const response = await fetch("/api/gasApi?action=getSeasonList");
  if (!response.ok) {
    throw new Error("시즌 정보를 가져오는 데 실패했습니다.");
  }
  const data = await response.json();
  return data;
}

async function fetchHistoryData() {
  const response = await fetch("/api/gasApi?action=getHistoryData");
  if (!response.ok) throw new Error("히스토리 데이터를 불러오지 못했습니다.");
  const data = await response.json();
  return data;
}

function calculateRanking(filteredHistory) {
  const stats = {};

  filteredHistory.forEach((entry) => {
    const username = entry.PLAYER;
    const result = entry.RESULT;
    const cls = entry.CLASS_USED;

    if (!stats[username]) {
      stats[username] = {
        username,
        wins: 0,
        druidWins: 0,
        oracleWins: 0,
        necroWins: 0,
        summonerWins: 0,
      };
    }

    if (result === "WIN") {
      stats[username].wins += 1;
      if (cls === "드") stats[username].druidWins += 1;
      else if (cls === "어") stats[username].oracleWins += 1;
      else if (cls === "넥") stats[username].necroWins += 1;
      else if (cls === "슴") stats[username].summonerWins += 1;
    }
  });

  const players = Object.values(stats);

  players.sort((a, b) => {
    if (b.wins === a.wins) {
      return a.username.localeCompare(b.username, "ko");
    }
    return b.wins - a.wins;
  });

  let rank = 1;
  for (let i = 0; i < players.length; i++) {
    if (i > 0 && players[i].wins === players[i - 1].wins) {
      players[i].rank = players[i - 1].rank;
    } else {
      players[i].rank = rank;
    }
    rank++;
  }

  return players;
}

export default function UserPage() {
  const [userList, setUserList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [seasonList, setSeasonList] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [seasonStats, setSeasonStats] = useState([]);
  const [isUserListLoading, setIsUserListLoading] = useState(true);
  const [isSeasonStatsLoading, setIsSeasonStatsLoading] = useState(true);

  const router = useRouter();
  

  useEffect(() => {
    setIsUserListLoading(true);
    fetchUserList()
      .then((data) => {
        if (data.users) {
          setUserList(data.users);
        }
        setIsUserListLoading(false);
      })
      .catch((err) => {
        console.error("유저 목록 불러오기 실패:", err);
        setIsUserListLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchSeasonList()
      .then((data) => {
        setSeasonList(data);
        setSelectedSeason(data[data.length - 1]);
      })
      .catch((err) => console.error("시즌 리스트 불러오기 실패:", err));
  }, []);

  useEffect(() => {
    if (!selectedSeason) return;
    setIsSeasonStatsLoading(true);

    fetchHistoryData().then((data) => {
      const start = new Date(selectedSeason.START_TIME);
      const end = new Date(selectedSeason.END_TIME);

      const filtered = data.filter((entry) => {
        const d = new Date(entry.TIMESTAMP);
        const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        return date >= start && date <= end;
      });

      const ranked = calculateRanking(filtered);
      setSeasonStats(ranked);
      setIsSeasonStatsLoading(false);
    });
  }, [selectedSeason]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
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
      <div className="overflow-x-auto whitespace-nowrap my-6 mx-auto">
        {isUserListLoading ? (
          <p className="text-gray-400 text-sm text-center">🚀 유저 데이터를 불러오는 중입니다...</p>
        ) : (
          <div
            className="relative w-[824px] h-[200px] mx-auto my-6 rounded-lg p-4"
            style={{ backgroundColor: "#353f54" }}
          >
            <div className="flex flex-wrap justify-left gap-1 w-full h-full items-center">
              {userList.map((user) => (
                <button
                  key={user}
                  onClick={() => setSelectedUser(user)}
                  className="px-3 py-1 text-white bg-transparent border border-white rounded-full shadow-md hover:bg-white hover:text-gray-900 transition-all duration-200 text-sm"
                >
                  {user}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {!selectedUser ? (
        <p className="text-center mt-10 text-gray-400">👆 유저를 선택해주세요.</p>
      ) : (
        <div
          className="bg-center bg-no-repeat bg-contain p-6 rounded-lg max-w-1xl mx-auto -mt-10 relative"
          style={{
            width: "824px",
            height: "768px",
            backgroundImage: "url('/icons/bg/player_bg.png')",
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            padding: "2rem",
            color: "white",
          }}
        >
          <div className="absolute top-10 right-10">
            {seasonList.length > 0 && selectedSeason && (
              <select
                className="bg-gray-800 text-white p-2 rounded"
                value={selectedSeason?.TITLE || ""}
                onChange={(e) => {
                  const season = seasonList.find((s) => s.TITLE === e.target.value);
                  setSelectedSeason(season);
                }}
              >
                {seasonList.map((season) => (
                  <option key={season.TITLE} value={season.TITLE}>
                    {season.TITLE}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex p-8">
            <div className="flex flex-col items-center space-y-2 w-[200px]">
              <div className="relative w-[240px] h-[240px] rounded overflow-hidden border border-gray-500">
                <Image
                  src={`/icons/users/웹_${selectedUser}.jpg`}
                  alt={selectedUser}
                  fill
                  className="object-contain"
                  onError={(e) => (e.currentTarget.src = "/icons/users/default.png")}
                />
              </div>
              <h2 className="text-4xl font-bold text-white">{selectedUser}</h2>
            </div>

            <UserSeasonStats
              username={selectedUser}
              seasonStats={seasonStats}
              isLoading={isSeasonStatsLoading}
              season={selectedSeason.TITLE}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function UserSeasonStats({ username, seasonStats, isLoading ,season}) {
  if (isLoading) {
    return (
      <div className="ml-12 flex flex-col justify-center text-lg text-gray-400">
        ⏳ 시즌 데이터를 불러오는 중입니다...
      </div>
    );
  }

  const user = seasonStats.find((u) => u.username === username);

  if (!user) {
    return (
      <div className="ml-12 flex flex-col justify-center text-lg text-gray-400">
        ❌ 해당 시즌 기록이 없습니다.
      </div>
    );
  }

  const { wins, druidWins, oracleWins, necroWins, summonerWins, rank } = user;

  return (
    <div className="ml-12 flex flex-col justify-center space-y-3 text-lg">
      <h3 className="text-3xl font-bold text-yellow-300 mb-2">📊 {season}</h3>
      <h3 className="text-3xl font-bold text-red-800 mb-2">
        <span className="mx-5"></span>
        <span>WIN</span>
        <span className="mx-5"></span>
        <span>RANK</span>
      </h3>
      
      <div className="flex flex-col gap-1 text-2xl">
        {druidWins > 0 && (
          <div className="flex items-center space-x-2">
            <Image src="/icons/classes/druid.jpg" alt="드루이드" width={32} height={32} />
            <span className="mx-2"></span>
            <span>{druidWins}</span>
            <span className="mx-11.5"></span>
            <span>-위</span>
          </div>
        )}
        {oracleWins > 0 && (
          <div className="flex items-center space-x-2">
            <Image src="/icons/classes/oracle.jpg" alt="오라클" width={32} height={32} />
            <span className="mx-2"></span>
            <span>{oracleWins}</span>
            <span className="mx-10"></span>
            <span>-위</span>
          </div>
        )}
        {necroWins > 0 && (
          <div className="flex items-center space-x-2">
            <Image src="/icons/classes/necro.jpg" alt="네크로맨서" width={32} height={32} />
            <span className="mx-2"></span>
            <span>{necroWins}</span>
            <span className="mx-11.5"></span>
            <span>-위</span>
          </div>
        )}
        {summonerWins > 0 && (
          <div className="flex items-center space-x-2">
            <Image src="/icons/classes/summoner.jpg" alt="소환사" width={32} height={32} />
            <span className="mx-2"></span>
            <span>{summonerWins}</span>
            <span className="mx-10"></span>
            <span>-위</span>
          </div>
        )}
        <p className="text-red-800 text-2xl mb-2">
          <span>ALL</span>
          <span className="mx-2"></span>
          <span>{wins}</span>
          <span className="mx-10"></span>
          <span>{rank}위</span>
        </p>
      </div>
      
    </div>
  );
}