"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

// ✅ GAS API
async function fetchUserList() {
  const res = await fetch("/api/gasApi?action=getUsersAndAliases");
  const data = await res.json();
  return data;
}

async function fetchSeasonList() {
  const response = await fetch("/api/gasApi?action=getSeasonList");
  if (!response.ok) throw new Error("시즌 정보를 가져오는 데 실패했습니다.");
  return await response.json();
}

async function fetchUserSummary() {
  const response = await fetch("/api/gasApi?action=getUserSummary");
  if (!response.ok) throw new Error("요약 데이터를 가져오지 못했습니다.");
  return await response.json(); // [{ SEASON, PLAYER, TOTAL_WINS, TOTAL_RANK, D_WINS, D_RANK, ... }]
}

async function fetchSeasonPrevRank() {
  const res = await fetch("/api/gasApi?action=getSeasonPrevRank");
  const data = await res.json();
  return data; // [{ PLAYER: "야로", PrevRank: 20 }, ...]
}

async function fetchUserDuoStats() {
  const res = await fetch("/api/gasApi?action=getUserDuoStats");
  const data = await res.json();
  return data;
}

async function fetchRecentGames() {
  const res = await fetch("/api/gasApi?action=getRecentGames");
  const data = await res.json();
  return data;
}

export default function UserPage() {
  const [userList, setUserList] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [seasonList, setSeasonList] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [seasonStats, setSeasonStats] = useState([]);
  const [isUserListLoading, setIsUserListLoading] = useState(true);
  const [isSeasonStatsLoading, setIsSeasonStatsLoading] = useState(true);
  const [duoStats, setDuoStats] = useState([]);
  const [recentGames, setRecentGames] = useState([]);

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
  
    Promise.all([
      fetchUserSummary(),        // 현재 시즌 요약
      fetchSeasonPrevRank()     // 시즌별 이전 랭크
    ])
      .then(([summaryData, prevRankList]) => {
        console.log("🔍 [selectedSeason.TITLE]:", selectedSeason.TITLE);
        console.log("🧾 [summaryData]", summaryData);
        console.log("🧾 [prevRankList]", prevRankList);
  
        const filtered = summaryData.filter(user => user.SEASON === selectedSeason.TITLE);
        console.log("✅ [filtered summaryData]:", filtered.map(u => u.PLAYER));
  
        // 🔁 prevMap: "야로" → 전체 row
        const prevMap = new Map(
          prevRankList
            .filter(p => p.SEASON === selectedSeason.TITLE)
            .map(p => {
              console.log(`🧩 Season match: ${p.PLAYER} / ${p.SEASON}`);
              return [p.PLAYER.trim(), p];
            })
        );
  
        const merged = filtered.map(user => {
          const prev = prevMap.get(user.PLAYER.trim()) || {};
          console.log(`🔗 Merging ${user.PLAYER} with prev:`, prev);
  
          return {
            ...user,
            D_PREV_RANK: prev.D_PREV_RANK,
            A_PREV_RANK: prev.A_PREV_RANK,
            N_PREV_RANK: prev.N_PREV_RANK,
            S_PREV_RANK: prev.S_PREV_RANK,
            TOTAL_PREV_RANK: prev.PrevRank
          };
        });
  
        console.log("📦 [merged final seasonStats]:", merged);
  
        setSeasonStats(merged);
        setIsSeasonStatsLoading(false);
      })
      .catch((err) => {
        console.error("❌ 요약/이전랭크 데이터 로딩 실패:", err);
        setIsSeasonStatsLoading(false);
      });
  }, [selectedSeason]);

  useEffect(() => {
    if (!selectedUser || !selectedSeason) return;
  
    fetchUserDuoStats().then((data) => {
      const filtered = data.filter(row =>
        row.SEASON === selectedSeason.TITLE &&
        (row.PLAYER1 === selectedUser || row.PLAYER2 === selectedUser)
      );
  
      const processed = filtered
        .map(row => ({
          partner: row.PLAYER1 === selectedUser ? row.PLAYER2 : row.PLAYER1,
          WINS: row.WINS,
          DUO_RANK: row.DUO_RANK,
        }))
        .sort((a, b) => b.WINS - a.WINS)
        .slice(0, 5); // ✅ 여기서 자르기
  
      setDuoStats(processed);
    });
  }, [selectedUser, selectedSeason]);

  useEffect(() => {
    if (!selectedUser || !selectedSeason) return;
  
    fetchRecentGames().then((data) => {
      const filtered = data
        .filter(row =>
          row.SEASON === selectedSeason.TITLE &&
          row.PLAYER === selectedUser
        )
        .slice(-5) // 최근 5게임만
        .reverse(); // 최신순 정렬
  
      setRecentGames(filtered);
    });
  }, [selectedUser, selectedSeason]);
  

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* 네비게이션 바 */}
      <nav className="flex justify-start items-center space-x-6 bg-gray-800 p-2 rounded-lg shadow-md text-lg font-bold tracking-widest pl-4">
        <div className="relative w-12 h-12">
          <Image src="/icons/logo.png" alt="Logo" fill className="object-contain" />
        </div>
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
            onClick={() => router.push(path)}
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

      {/* 유저 선택 버튼 */}
      <div className="overflow-x-auto whitespace-nowrap my-6 mx-auto">
        {isUserListLoading ? (
          <p className="text-gray-400 text-sm text-center">🚀 유저 데이터를 불러오는 중입니다...</p>
        ) : (
          <div className="relative w-[824px] h-[200px] mx-auto my-6 rounded-lg p-4 bg-[#353f54]">
            <div className="flex flex-wrap justify-left gap-1 w-full h-full items-center">
              {userList.map((user) => (
                <button
                  key={user}
                  onClick={() => setSelectedUser(user)}
                  className="px-3 py-1 text-white border border-white rounded-full shadow-md hover:bg-white hover:text-gray-900 transition-all duration-200 text-sm"
                >
                  {user}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 유저 상세 카드 */}
      {!selectedUser ? (
        <p className="text-center mt-10 text-gray-400">👆 유저를 선택해주세요.</p>
      ) : (
        <div className="bg-center bg-no-repeat bg-contain p-6 rounded-lg max-w-1xl mx-auto -mt-10 relative"
          style={{
            width: "824px",
            height: "768px",
            backgroundImage: "url('/icons/bg/player_bg.png')",
            backgroundSize: "contain",
            padding: "2rem"
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

          <div className="flex p-8 items-start">
            <div className="flex flex-col items-center space-y-2 w-[200px]">
              <div className="relative w-[250px] h-[250px] rounded overflow-hidden border border-gray-500">
                <Image
                  src={`/icons/users/웹_${selectedUser}.jpg`}
                  alt={selectedUser}
                  fill
                  className="object-contain"
                  onError={(e) => (e.currentTarget.src = "/icons/users/default.png")}
                />
              </div>
              <h2 className="text-4xl font-bold text-white mb-1">{selectedUser}</h2>
            </div>
            <UserSeasonStats
              username={selectedUser}
              seasonStats={seasonStats}
              isLoading={isSeasonStatsLoading}
              season={selectedSeason.TITLE}
            />
          </div>
          {selectedUser && selectedSeason && (
            <UserDuoStats
              duoStats={duoStats}
              selectedUser={selectedUser}
              seasonTitle={selectedSeason.TITLE}
            />
          )}
          {selectedUser && selectedSeason && (
  <UserRecentGames recentGames={recentGames} />
)}

        </div>
      )}
    </div>
  );
}

function UserSeasonStats({ username, seasonStats, isLoading, season }) {
  if (isLoading) {
    return (
      <div className="ml-12 flex flex-col justify-center text-lg text-gray-400">
        ⏳ 시즌 데이터를 불러오는 중입니다...
      </div>
    );
  }

  const user = seasonStats.find((u) => u.PLAYER === username);

  if (!user) {
    return (
      <div className="ml-12 flex flex-col justify-center text-lg text-gray-400">
        ❌ 해당 시즌 기록이 없습니다.
      </div>
    );
  }

  const {
    TOTAL_WINS: wins,
    TOTAL_RANK: rank,
    TOTAL_PREV_RANK: prevRank,
    D_WINS: druidWins,
    D_RANK: druidRank,
    D_PREV_RANK: druidPrev,
    A_WINS: oracleWins,
    A_RANK: oracleRank,
    A_PREV_RANK: oraclePrev,
    N_WINS: necroWins,
    N_RANK: necroRank,
    N_PREV_RANK: necroPrev,
    S_WINS: summonerWins,
    S_RANK: summonerRank,
    S_PREV_RANK: summonerPrev
  } = user;

  const classStats = [
    {
      key: "druid",
      wins: druidWins,
      rank: druidRank,
      prev: druidPrev,
      icon: "/icons/classes/druid.jpg",
    },
    {
      key: "oracle",
      wins: oracleWins,
      rank: oracleRank,
      prev: oraclePrev,
      icon: "/icons/classes/oracle.jpg",
    },
    {
      key: "necro",
      wins: necroWins,
      rank: necroRank,
      prev: necroPrev,
      icon: "/icons/classes/necro.jpg",
    },
    {
      key: "summoner",
      wins: summonerWins,
      rank: summonerRank,
      prev: summonerPrev,
      icon: "/icons/classes/summoner.jpg",
    },
  ];

  function getRankChangeIcon(current, prev) {
    const cur = Number(current);
    const prv = Number(prev);
    if (!prv || isNaN(prv)) return "/icons/rank/same.png";
    if (cur < prv) return "/icons/rank/up.png";
    if (cur > prv) return "/icons/rank/down.png";
    return "/icons/rank/same.png";
  }

  return (
    <div className="ml-12 flex flex-col justify-center text-lg">
      <h3 className="text-3xl font-bold text-yellow-300">{season}</h3>

      {/* 헤더 */}
      <div className="grid grid-cols-[40px_60px_60px_30px] gap-x-4 mb-2">
        <div></div>
        <div className="text-red-500 font-bold text-lg">WIN</div>
        <div className="text-red-500 font-bold text-lg">RANK</div>
        <div></div>
      </div>

      {/* 클래스별 데이터 */}
      <div className="grid grid-cols-[40px_60px_60px_30px] gap-x-4 gap-y-2 text-2xl items-center">
        {classStats.map(cls =>
          cls.wins > 0 && (
            <div key={cls.key} className="contents">
              <Image src={cls.icon} alt={cls.key} width={40} height={40} />
              <div className="text-right">{cls.wins}</div>
              <div className="text-right">{cls.rank}위</div>
              <div className="relative w-[24px] h-[24px]">
                <Image
                  src={getRankChangeIcon(cls.rank, cls.prev)}
                  alt="변동"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          )
        )}

        {/* ALL 줄 */}
        <div className="contents font-bold text-red-500 mt-4">
          <div className="text-lg">ALL</div>
          <div className="text-right text-2xl">{wins}</div>
          <div className="text-right text-2xl">{rank}위</div>
          <div className="relative w-[24px] h-[24px]">
            <Image
              src={getRankChangeIcon(rank, prevRank)}
              alt="전체 변동"
              fill
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function UserDuoStats({ duoStats, selectedUser, seasonTitle }) {
  if (!duoStats || duoStats.length === 0) return null;

  return (
    <>
      {/* 상단 구분선 */}
      <div className="w-full h-[2px] bg-gray-600 rounded-full -mt-8 mb-2" />

      {/* DUO ALL 영역 */}
      <div className="mt-4">
        <h3 className="text-xl text-white font-semibold mb-2">
          DUO {seasonTitle}
        </h3>

        {/* 헤더 */}
        <div className="flex items-center gap-4 text-sm text-gray-400 font-semibold mb-1 pl-[2px]">
          <span className="min-w-[160px]">Combi</span>
          <span className="w-[50px] text-red-400">Win</span>
          <span className="w-[60px] text-yellow-300 whitespace-nowrap">Duo Rank</span>
        </div>

        {/* 목록 */}
        <div className="flex flex-col gap-[2px] text-sm leading-tight text-white">
          {duoStats.map((duo, index) => (
            <div key={index} className="flex items-center gap-4">
              <span className="min-w-[160px]">{index + 1}. {selectedUser} & {duo.partner}</span>
              <span className="w-[50px] text-red-400 font-semibold">{duo.WINS}승</span>
              <span className="w-[60px] text-yellow-300 whitespace-nowrap">{duo.DUO_RANK}위</span>
            </div>
          ))}
        </div>
      </div>

      {/* ✅ 하단 구분선 추가 */}
      <div className="w-full h-[2px] bg-gray-600 rounded-full mt-4 mb-1" />
    </>
  );
}

function UserRecentGames({ recentGames }) {
  if (!recentGames || recentGames.length === 0) return null;

  return (
    <>
      {/* 제목 */}
      <div className="mt-2">
        <h3 className="text-xl text-white font-semibold mb-2">Recent Games</h3>
        <div className="flex flex-col gap-[1px] text-sm text-white leading-[1.1rem]">
          {recentGames.map((game, idx) => (
            <div key={idx} className="flex items-center gap-4">
              <span className="w-[100px] text-gray-400">{formatDate(game.DATE)}</span>
              <div className="flex items-center space-x-2">
                <Image
                  src={`/icons/classes/${getClassIconFilename(game.CLASS_USED)}`}
                  alt={game.CLASS_USED}
                  width={24}
                  height={24}
                />
                <span>{game.CLASS_USED}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// 클래스 파일명 매핑 (예: "드" → druid.jpg)
function getClassIconFilename(cls) {
  switch (cls) {
    case "드": return "druid.jpg";
    case "어": return "oracle.jpg";
    case "넥": return "necro.jpg";
    case "슴": return "summoner.jpg";
    default: return "default.jpg";
  }
}

function formatDate(isoString) {
  return isoString.slice(0, 10); // "2025-04-11T..." → "2025-04-11"
}





