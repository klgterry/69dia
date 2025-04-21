"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import UserFullHistory from "@/components/UserFullHistory";
import { useSearchParams } from "next/navigation"; // 맨 위에 추가


// ✅ GAS API
async function fetchUserList() {
  const res = await fetch("/api/gasApi?action=getFilteredUsers");
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

async function fetchLeaderboardForAllSeason() {
  const response = await fetch("/api/gasApi?action=getLeaderboard");
  if (!response.ok) {
    throw new Error("Failed to fetch leaderboard");
  }

  const data = await response.json();

  // 👇 여기를 보완
  if (!data.players) {
    console.error("⚠️ GAS 응답에 players 없음:", data);
    return { players: [] }; // fallback
  }

  return data; // { players: [...] }
}

function calculateGlobalDuoRanks(duoStats) {
  const merged = {};

  for (const row of duoStats) {
    const [a, b] = [row.PLAYER1, row.PLAYER2].sort();
    const key = `${a}-${b}`;

    if (!merged[key]) {
      merged[key] = {
        key,
        players: [a, b],
        WINS: row.WINS,
      };
    } else {
      merged[key].WINS += row.WINS;
    }
  }

  // ✅ 승수 기준 정렬 후 랭크 부여
  const ranked = Object.values(merged)
    .sort((a, b) => b.WINS - a.WINS)
    .map((entry, index) => ({
      ...entry,
      DUO_RANK: index + 1,
    }));

  return ranked;
}

function getTopUserDuosInAllSeason(duoStats, selectedUser) {
  const rankedDuos = calculateGlobalDuoRanks(duoStats);

  const filtered = rankedDuos
    .filter(entry => entry.players.includes(selectedUser))
    .map(entry => ({
      partner: entry.players.find(p => p !== selectedUser),
      WINS: entry.WINS,
      DUO_RANK: entry.DUO_RANK,
    }))
    .sort((a, b) => b.WINS - a.WINS)
    .slice(0, 5);

  return filtered;
}



export default function UserPage() {
  const [userList, setUserList] = useState([]);
  const [seasonList, setSeasonList] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [isUserListLoading, setIsUserListLoading] = useState(true);
  const [isSeasonStatsLoading, setIsSeasonStatsLoading] = useState(true);
  const [duoStats, setDuoStats] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [userSummaryData, setUserSummaryData] = useState([]);
  const [userBestRank, setUserBestRank] = useState(null);
  const [seasonStats, setSeasonStats] = useState(null);
  const [recentGamesRendered, setRecentGamesRendered] = useState(false);
  const [awardsRendered, setAwardsRendered] = useState(false);
  const [allGames, setAllGames] = useState([]);
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const username = params.get("name");
    const season = params.get("season");
  
    setSelectedUser(username);
  
    fetchSeasonList().then((data) => {
      const allOption = { TITLE: "ALL", START_TIME: null, END_TIME: null };
      const fullList = [allOption, ...data];
      setSeasonList(fullList);
  
      const defaultSeason = fullList.find((s) => s.TITLE === season) || allOption;
      setSelectedSeason(defaultSeason);
    });
  }, []);

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

  // 시즌 변경만 감지해서 fetch
  useEffect(() => {
    if (!selectedSeason || !selectedUser) return;
  
    if (selectedSeason.TITLE === "ALL") {
      setIsSeasonStatsLoading(true); // ✅ 로딩 시작
  
      fetchLeaderboardForAllSeason()
        .then((data) => {
          const user = data.players.find(
            (p) => (p.username || p.PLAYER)?.trim().toLowerCase() === selectedUser?.trim().toLowerCase()
          );
  
          if (user) {
            setSeasonStats([
              {
                username: user.username,
                PLAYER: user.username,
                TOTAL_WINS: user.wins,
                TOTAL_RANK: user.rank,
                D_WINS: user.druidWins,
                D_RANK: user.druidRank,
                A_WINS: user.oracleWins,
                A_RANK: user.oracleRank,
                N_WINS: user.necroWins,
                N_RANK: user.necroRank,
                S_WINS: user.summonerWins,
                S_RANK: user.summonerRank,
              },
            ]);
          } else {
            setSeasonStats([]); // 없으면 빈 배열
          }
        })
        .catch((err) => {
          console.error("❌ ALL 시즌 fetch 실패", err);
          setSeasonStats([]); // 에러도 빈 배열 처리
        })
        .finally(() => {
          setIsSeasonStatsLoading(false); // ✅ 로딩 종료
        });
    }
  }, [selectedSeason, selectedUser]);
  
  useEffect(() => {
    fetchUserSummary().then(setUserSummaryData);
  }, []);
  
  
  useEffect(() => {
    if (!selectedSeason || userSummaryData.length === 0) return;
  
    setIsSeasonStatsLoading(true);
  
    fetchSeasonPrevRank().then((prevRankList) => {
      const filtered = userSummaryData.filter(user => user.SEASON === selectedSeason.TITLE);
  
      const prevMap = new Map(
        prevRankList
          .filter(p => p.SEASON === selectedSeason.TITLE)
          .map(p => [p.PLAYER.trim(), p])
      );
  
      const merged = filtered.map(user => {
        const prev = prevMap.get(user.PLAYER.trim()) || {};
  
        return {
          ...user,
          D_PREV_RANK: prev.D_PREV_RANK,
          A_PREV_RANK: prev.A_PREV_RANK,
          N_PREV_RANK: prev.N_PREV_RANK,
          S_PREV_RANK: prev.S_PREV_RANK,
          TOTAL_PREV_RANK: prev.PrevRank
        };
      });
  
      setSeasonStats(merged);
      setIsSeasonStatsLoading(false);
    }).catch(err => {
      console.error("❌ 시즌 이전 랭크 가져오기 실패:", err);
      setIsSeasonStatsLoading(false);
    });
  }, [selectedSeason, userSummaryData]);

  useEffect(() => {
    if (!selectedUser || userSummaryData.length === 0 || seasonList.length === 0) return;
  
    const now = new Date();
  
    const endedSeasons = new Set(
      seasonList
        .filter(season => {
          const endDate = season.END_TIME ? new Date(season.END_TIME) : null;
          return endDate && endDate < now;
        })
        .map(season => season.TITLE)
    );
  
    const ranks = userSummaryData
      .filter(row => row.PLAYER === selectedUser && endedSeasons.has(row.SEASON))
      .map(row => Number(row.TOTAL_RANK))
      .filter(rank => !isNaN(rank));
  
    setUserBestRank(ranks.length ? Math.min(...ranks) : null);
  }, [selectedUser, userSummaryData.length, seasonList.length]);

  useEffect(() => {
    if (!selectedUser || !selectedSeason?.TITLE || seasonList.length === 0) return;
  
    fetchUserDuoStats().then((data) => {
      let filtered = data.filter(row =>
        selectedSeason.TITLE === "ALL" || row.SEASON === selectedSeason.TITLE
      );
  
      if (selectedSeason.TITLE === "ALL") {
        const topUserDuos = getTopUserDuosInAllSeason(data, selectedUser);
        setDuoStats(topUserDuos);
      } else {
        const processed = filtered
          .filter(row => row.PLAYER1 === selectedUser || row.PLAYER2 === selectedUser)
          .map(row => ({
            partner: row.PLAYER1 === selectedUser ? row.PLAYER2 : row.PLAYER1,
            WINS: row.WINS,
            DUO_RANK: row.DUO_RANK,
          }))
          .sort((a, b) => b.WINS - a.WINS)
          .slice(0, 5);
  
        setDuoStats(processed);
      }
    });
  }, [selectedUser, selectedSeason?.TITLE, seasonList.length]);
  
  useEffect(() => {
    if (!selectedUser) return;
  
    fetchRecentGames().then((data) => {
      const userGames = data.filter(row => row.PLAYER === selectedUser);
  
      const recent = userGames
        .sort((a, b) => new Date(b.DATETIME) - new Date(a.DATETIME))
        .slice(0, 5);
  
      setRecentGames(recent);         // 최근 5게임만
      setAllGames(userGames);         // 🔥 전체 게임도 저장
    });
  }, [selectedUser]); // ⛔ selectedSeason은 제외

  useEffect(() => {
    // 유저가 바뀔 때마다 이전 시즌 기록 초기화
    setSeasonStats(null);
  }, [selectedUser, selectedSeason]);

  useEffect(() => {
    if (recentGames?.length && !recentGamesRendered) {
      setRecentGamesRendered(true);
    }
  }, [recentGames]);
  
  useEffect(() => {
    if (userSummaryData?.length && !awardsRendered) {
      setAwardsRendered(true);
    }
  }, [userSummaryData]);
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">

      {/* 유저 상세 카드 */}
      {!selectedUser ? (
        <p className="text-center mt-10 text-gray-400">👆 유저를 선택해주세요.</p>
      ) : (
        <div className="bg-center bg-no-repeat bg-contain p-6 rounded-lg max-w-1xl mx-auto relative"
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
              className="bg-gray-800 text-white p-2 rounded ml-7"
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

          {/* 🎖 시즌 BEST 배너 - 항상 표시 */}
          <div className="relative w-[200px] h-[300px]">
            <Image
              src="/icons/etc/시즌베스트.png" // 또는 "/시즌베스트.png"
              alt="All Season Best"
              fill
              className="object-contain"
            />
          </div>
            {/* 🥇 최고 랭크 출력 텍스트 */}
            {userBestRank !== null && (
              <div className="absolute top-4/9 w-full text-center text-white text-7xl drop-shadow-[0_0_4px_rgba(255,0,0,1)]">
                {userBestRank}위
              </div>
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

            {isSeasonStatsLoading ? (
              <div className="ml-12 text-lg text-gray-400 flex items-center">⏳ 시즌 데이터를 불러오는 중입니다...</div>
            ) : (
              <UserSeasonStats
                username={selectedUser}
                seasonStats={seasonStats}
                isLoading={isSeasonStatsLoading}
                season={selectedSeason?.TITLE || "ALL"}
                seasonList={seasonList}
              />
            )}
          </div>
          {/* 🔴 아래쪽 전체 콘텐츠도 조건부 */}
          {(isSeasonStatsLoading || !duoStats) && !(recentGamesRendered || awardsRendered) ? (
            <div className="text-center mt-10 text-lg text-gray-400">⏳ 데이터를 불러오는 중입니다...</div>
          ) : (
            <>
              {/* 시즌 기반 데이터: 듀오 통계 */}
              {!isSeasonStatsLoading && duoStats && (
              <div className="flex justify-between items-start gap-4 border-t border-gray-600 -mt-8">
              {/* 왼쪽: DUO */}
              <div className="flex-1">
                <UserDuoStats
                  duoStats={duoStats}
                  selectedUser={selectedUser}
                  seasonTitle={selectedSeason?.TITLE || "ALL"}
                />
              </div>
            
              {/* 오른쪽: 최다연승 */}
              <div className="ml-0 -translate-x-35">

                <UserStatsExtra
                  recentGames={allGames}
                  summaryData={userSummaryData}
                  selectedUser={selectedUser}
                  selectedSeason={selectedSeason}
                />
              </div>
            </div>
              )}
              <div className="w-full h-[1px] bg-gray-600 my-3" />
              {/* 고정 출력: recentGames & awards */}
              <div className="flex flex-row gap-6 items-start justify-start mt-4 min-h-[200px]">
                {/* 왼쪽: RecentGames */}
                <div className="w-[280px]">
                  {recentGamesRendered ? (
                    <UserRecentGames recentGames={recentGames} />
                  ) : (
                    <div className="text-gray-500 text-sm h-[150px] flex items-center justify-center">
                      ⏳ 최근 경기 불러오는 중...
                    </div>
                  )}
                </div>

                {/* 오른쪽: Awards */}
                <div className="flex-1 min-w-[250px]">
                  {awardsRendered ? (
                    <UserAwards
                      seasonStats={userSummaryData}
                      selectedUser={selectedUser}
                      seasonList={seasonList}
                    />
                  ) : (
                    <div className="text-gray-500 text-sm h-[150px] flex items-center justify-center">
                      ⏳ Awards 불러오는 중...
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function UserSeasonStats({ username, seasonStats, isLoading, season, seasonList }) {
  if (isLoading || seasonStats === null) {
    return <div className="ml-12 text-lg text-gray-400">⏳ 시즌 데이터를 불러오는 중...</div>;
  }

  const isAllSeason = season === "ALL";

  // 시즌 종료 여부 확인
  const seasonMeta = seasonList?.find((s) => s.TITLE === season);
  const isSeasonOngoing = seasonMeta?.END_TIME
    ? new Date(seasonMeta.END_TIME) > new Date()
    : true;

  const user = seasonStats.find((u) =>
    isAllSeason ? u.username === username : u.PLAYER === username
  );

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
    S_PREV_RANK: summonerPrev,
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
      <h3 className="text-3xl font-bold text-yellow-300 text-center">{season}</h3>


      {/* 헤더 */}
      <div className="grid grid-cols-[40px_60px_60px_30px] gap-x-4 mb-2">
        <div></div>
        <div className="text-white font-bold text-lg pl-5">WIN</div>
        <div className="text-white font-bold text-lg pl-3">RANK</div>
        <div></div>
      </div>

      {/* 클래스별 데이터 */}
      <div className="grid grid-cols-[40px_60px_60px_30px] gap-x-4 gap-y-2 text-2xl items-center">
        {classStats.map(
          (cls) =>
            cls.wins > 0 && (
              <div key={cls.key} className="contents">
                <Image src={cls.icon} alt={cls.key} width={40} height={40} />
                <div className="text-right">{cls.wins}승</div>
                <div className="text-right">{cls.rank}위</div>
                {isAllSeason || !isSeasonOngoing ? (
                  <div className="w-[24px] h-[24px]" />
                ) : (
                  <div className="relative w-[24px] h-[24px]">
                    <Image
                      src={getRankChangeIcon(cls.rank, cls.prev)}
                      alt="변동"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
              </div>
            )
        )}

        {/* ALL 줄 출력 */}
        <div className="contents font-bold text-white mt-4">
          <div className="text-lg">ALL</div>
          <div className="text-right text-2xl text-red-500">{wins}승</div>
          <div className="text-right text-2xl text-red-500">{rank}위</div>
          {!isAllSeason && isSeasonOngoing ? (
            <div className="relative w-[24px] h-[24px]">
              <Image
                src={getRankChangeIcon(rank, prevRank)}
                alt="전체 변동"
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div className="w-[24px] h-[24px]" />
          )}
        </div>
      </div>
    </div>
  );
}

function UserDuoStats({ duoStats, selectedUser, seasonTitle }) {
  if (!duoStats || duoStats.length === 0) return null;

  return (
    <>
      {/* DUO ALL 영역 */}
      <div className="mt-4 ml-7">
        <h3 className="text-xl text-white font-semibold mb-2">
          DUO {seasonTitle}
        </h3>

        {/* 헤더 */}
        <div className="flex items-center gap-4 text-sm text-gray-400 font-semibold mb-1 pl-[2px]">
          <span className="min-w-[160px]">Combi</span>
          <span className="w-[30px] text-white">Win</span>
          <span className="w-[60px] text-white whitespace-nowrap">Duo Rank</span>
        </div>

        {/* 목록 */}
        <div className="flex flex-col gap-[2px] text-sm leading-tight text-white">
          {duoStats.map((duo, index) => (
            <div key={index} className="flex items-center gap-4">
              <span className="min-w-[160px]">{index + 1}. {selectedUser} & {duo.partner}</span>
              <span className="w-[50px] text-white font-semibold">{duo.WINS}승</span>
              <span className="w-[60px] text-white whitespace-nowrap">{duo.DUO_RANK}위</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function UserRecentGames({ recentGames }) {
  if (!recentGames || recentGames.length === 0) return null;

  return (
    <>
      <div className="ml-7 -mt-2">
        <h3 className="text-xl text-white font-semibold mb-2">Recent Games</h3>
        <div className="flex flex-col gap-[2px] text-sm text-white leading-[1.1rem] pl-5">
          {recentGames.map((game, idx) => (
            <div key={idx} className="flex items-center gap-4">
              {/* 날짜 + 시간 */}
              <span className="w-[120px] text-gray-400">{formatDateTime(game.DATETIME)}</span>

              {/* 클래스 아이콘 + 텍스트 */}
              <div className="flex items-center space-x-1 w-[50px]">
                <Image
                  src={`/icons/classes/${getClassIconFilename(game.CLASS_USED)}`}
                  alt={game.CLASS_USED}
                  width={24}
                  height={24}
                  className="block"
                />
              </div>

              {/* 승/패 표시 */}
              <span
                className={`font-bold text-center w-[10px] ${
                  game.RESULT === "WIN" ? "text-green-400" : "text-red-400"
                }`}
              >
                {game.RESULT}
              </span>
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

function formatDateTime(isoString) {
  const date = new Date(isoString);

  // 한국 시간 (UTC+9)으로 변환
  const options = {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };

  const formatter = new Intl.DateTimeFormat('ko-KR', options);
  return formatter.format(date).replace(/\. /g, '-').replace(/\./, '').replace(' ', ' ');
}

function UserAwards({ seasonStats, selectedUser, seasonList }) {
  if (!seasonStats || seasonStats.length === 0 || !selectedUser || !seasonList || seasonList.length === 0) return null;

  const today = new Date();

  // ✅ 종료된 시즌만 필터링 (ALL 제외)
  const endedSeasons = seasonList.filter(
    (s) => s.TITLE !== "ALL" && new Date(s.END_TIME) < today
  );

  console.log("📅 종료된 시즌 목록:", endedSeasons.map(s => s.TITLE));
  console.log("🎯 대상 유저:", selectedUser);
  console.log("📊 seasonStats:", seasonStats);

  const badgeMap = {
    1: { icon: "/icons/rank/1.png", seasons: [] },
    2: { icon: "/icons/rank/2.png", seasons: [] },
    3: { icon: "/icons/rank/3.png", seasons: [] },
  };

  // ✅ 유저의 시즌 랭크 기록을 순회
  seasonStats.forEach((stat) => {
    const player = (stat.PLAYER || "").trim();
    const season = stat.SEASON;
    const rank = Number(stat.TOTAL_RANK);

    const isEndedSeason = endedSeasons.some((s) => s.TITLE === season);

    if (player === selectedUser && isEndedSeason && rank >= 1 && rank <= 3) {
      badgeMap[rank].seasons.push(season);
    }
  });

  const badgesToShow = Object.entries(badgeMap)
    .filter(([_, v]) => v.seasons.length > 0)
    .map(([rank, v]) => ({
      rank,
      icon: v.icon,
      seasons: v.seasons,
    }));

  console.log("🏅 보여줄 뱃지:", badgesToShow);

  return (
    <div className="ml-30">
      <h3 className="text-xl text-white font-semibold mb-10 -mt-2">Awards</h3>
      {badgesToShow.length > 0 ? (
        <div className="flex flex-wrap gap-4">
          {badgesToShow.map((badge, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center text-sm text-white"
            >
              <div className="w-14 h-14 relative">
                <Image
                  src={badge.icon}
                  alt={`${badge.rank}등`}
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-xs mt-1 text-center text-yellow-300 leading-tight">
                {badge.seasons.join(", ")}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 text-sm">획득한 뱃지가 없습니다.</p>
      )}
    </div>
  );
}

function getMaxWinStreakWithSeason(games) {
  const streakBySeason = {};

  // 1. 시즌별로 게임 모으기
  for (const game of games) {
    const season = game.SEASON;
    if (!streakBySeason[season]) {
      streakBySeason[season] = [];
    }
    streakBySeason[season].push(game);
  }

  let bestStreak = 0;
  let bestSeason = "";

  for (const season in streakBySeason) {
    // ✅ 2. 날짜순 정렬
    const sortedGames = streakBySeason[season].sort(
      (a, b) => new Date(a.DATETIME) - new Date(b.DATETIME)
    );

    // 디버깅용 출력
    console.log(`📅 시즌: ${season}`);
    sortedGames.forEach((g, i) => {
      console.log(
        `  ${i + 1}. ${g.DATETIME} | ${g.RESULT} | ${g.CLASS_USED}`
      );
    });

    // 3. 연승 계산
    let max = 0, current = 0;
    for (const game of sortedGames) {
      if (game.RESULT === "WIN") {
        current++;
        max = Math.max(max, current);
      } else {
        if (current > 0) {
          console.log(`⚠️ 연승 끊김 (${current}연승 후) → ${game.DATETIME}`);
        }
        current = 0;
      }
    }

    if (max > bestStreak) {
      bestStreak = max;
      bestSeason = season;
    }
  }

  console.log("🏆 시즌별 최다연승:", bestStreak, `(${bestSeason})`);
  return {
    winStreak: bestStreak,
    season: bestSeason,
  };
}


function getMaxWinStreak(games, selectedSeasonTitle) {
  // 1. 시즌 필터링 + 정렬
  const filtered = (selectedSeasonTitle === "ALL"
    ? games
    : games.filter(game => game.SEASON === selectedSeasonTitle)
  ).sort((a, b) => new Date(a.DATETIME) - new Date(b.DATETIME));

  console.log("📋 [getMaxWinStreak] 선택된 시즌:", selectedSeasonTitle);
  console.log("🎮 필터링된 경기 목록:");
  filtered.forEach((g, idx) => {
    console.log(
      `  ${idx + 1}. ${g.DATETIME} | ${g.RESULT} | ${g.CLASS_USED} | ${g.SEASON}`
    );
  });

  // 2. 연승 계산
  let maxStreak = 0;
  let current = 0;

  for (const game of filtered) {
    if (game.RESULT === "WIN") {
      current++;
      maxStreak = Math.max(maxStreak, current);
    } else {
      console.log(`⚠️ 연승 끊김! (${current}연승 후) → ${game.DATETIME}`);
      current = 0;
    }
  }

  console.log("🏆 최종 최대 연승:", maxStreak);
  return maxStreak;
}


function UserStatsExtra({ recentGames, summaryData, selectedUser, selectedSeason }) {
  const isAllSeason = selectedSeason?.TITLE === "ALL";
  const winStreak = isAllSeason
    ? getMaxWinStreakWithSeason(recentGames)
    : getMaxWinStreak(recentGames, selectedSeason?.TITLE);

  const topSeasons = getTopSeasonsByWins(summaryData, selectedUser);

  return (
    <div className="text-xl text-white ml-6 mt-4 leading-tight">
      {/* 최다연승 */}
      <p className="mb-1 whitespace-nowrap font-semibold">
        {isAllSeason ? (
          <>
            최다연승 : <span className="text-yellow-300 font-semibold">{winStreak.winStreak}승</span>
            <span className="ml-1 text-gray-400 text-xs">({winStreak.season})</span>
          </>
        ) : (
          <>
            최다연승 : <span className="text-yellow-300 font-semibold">{winStreak}연승</span>
          </>
        )}
      </p>

      {/* ✅ 구분선 추가 */}
      <div className="w-full h-[1px] bg-gray-500 my-2" />

      {/* 시즌별 최다승 */}
      <p className="mb-1">시즌별 최다승</p>
      <div className="ml-2 text-gray-300 text-sm">
        {topSeasons.map((line, idx) => (
          <p key={idx}>• {line}</p>
        ))}
      </div>
    </div>
  );
}

function getTopSeasonsByWins(summaryData, selectedUser) {
  return summaryData
    .filter(row => row.PLAYER === selectedUser && row.SEASON !== "ALL")
    .sort((a, b) => b.TOTAL_WINS - a.TOTAL_WINS)
    .slice(0, 3) // 상위 3개
    .map(row => `${row.TOTAL_WINS}승, ${row.TOTAL_RANK}위 (${row.SEASON})`);
}



