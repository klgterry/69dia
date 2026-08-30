"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import UserFullHistory from "@/components/UserFullHistory";
import UserStatsSection from "@/components/UserStatsSection";
import WeeklyRanking from "@/components/WeeklyRanking"; // 경로는 실제 파일에 맞게
import { gasGet } from "@/lib/gasClient";
import {
  UserSeasonStats,
  UserDuoStats,
  UserRecentGames,
  UserAwards,
  UserStatsExtra,
} from "@/components/user/profileSections";

// ✅ GAS API
async function fetchUserList() {
  return gasGet("getFilteredUsers");
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
  return gasGet("getSeasonPrevRank"); // [{ PLAYER: "야로", PrevRank: 20 }, ...]
}

async function fetchUserDuoStats() {
  return gasGet("getUserDuoStats");
}

async function fetchRecentGames() {
  return gasGet("getRecentGames");
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
  const [playerScoresMap, setPlayerScoresMap] = useState(new Map());

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
    fetchSeasonList().then((data) => {
      const allOption = { TITLE: "ALL", START_TIME: null, END_TIME: null };
      const fullList = [allOption, ...data];
  
      setSeasonList(fullList);
      setSelectedSeason(allOption); // ✅ 디폴트는 "ALL"
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
    fetch("/api/gasApi?action=getPlayerScores")
      .then(r => r.json())
      .then(({ players }) => {
        const m = new Map(players.map(p => [p.PLAYER.trim(), p]));
        setPlayerScoresMap(m);
      })
      .catch(err => console.error("❌ getPlayerScores 실패:", err));
  }, []);
  
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
        const filteredAll = data
          .filter(row =>
            row.SEASON === "ALL" &&
            (row.PLAYER1 === selectedUser || row.PLAYER2 === selectedUser)
          )
          .filter(row => row.WINS > 0) // ✅ 0승 제외
          .map(row => ({
            partner: row.PLAYER1 === selectedUser ? row.PLAYER2 : row.PLAYER1,
            WINS: row.WINS,
            DUO_RANK: row.DUO_RANK,
          }))
          .sort((a, b) => b.WINS - a.WINS)
          .slice(0, 5);

        setDuoStats(filteredAll);
      } else {
        const processed = filtered
          .filter(row => 
            (row.PLAYER1 === selectedUser || row.PLAYER2 === selectedUser) &&
            row.WINS > 0 // ✅ 0승 제외
          )
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
  
      const recent = Array.from(new Map(
        userGames
          .sort((a, b) => new Date(b.DATETIME) - new Date(a.DATETIME))
          .map(game => [game.DATETIME + game.CLASS_USED, game])  // 고유 키 생성
      ).values()).slice(0, 5);
      
  
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
      {/* 네비게이션 바 */}
      <nav className="flex justify-start items-center space-x-6 bg-gray-800 p-2 rounded-lg shadow-md text-lg font-bold tracking-widest pl-4">
        <div className="relative w-12 h-12">
          <Image src="/icons/logo.png" alt="Logo" fill className="object-contain" />
        </div>
        {[
          { name: "home", path: "/" },
          //{ name: "rule", path: "/rule" },
          { name: "week", path: "/week" },
          { name: "setting", path: "/setting" },
          { name: "user", path: "/user" },
          { name: "history", path: "/history" },
          { name: "ready", path: "/ready" },
          { name: "prize", path: "/prize" }
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

      {/* 유저 선택 버튼 */}
      <div className="overflow-x-auto whitespace-nowrap my-6 mx-auto">
      <p className="text-center mt-10 text-sm text-gray-400">
        ※ Total 5 게임 이상부터 조회 가능합니다.
        <span className="mx-2 text-gray-600">|</span>
        <span className="text-white">👆 유저를 선택해주세요.</span>
      </p>
        {isUserListLoading ? (
          <p className="text-gray-400 text-sm text-center">🚀데이터를 불러오는 중입니다...</p>
        ) : (
          <div className="relative w-[824px] h-[220px] mx-auto my-6 rounded-lg p-4 bg-[#353f54]">
             
            <div className="flex flex-wrap justify-left gap-1 w-full h-full items-center">
            {userList.map((user) => (
            <button
              key={user}
              onClick={() => {
                setSelectedUser(user);
                const all = seasonList.find(s => s.TITLE === "ALL");
                if (all) setSelectedSeason(all);
              }}
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
        //<WeeklyRanking />
        <p className="text-center mt-10 text-sm text-gray-400">
        ※ 사이트 최적화 중입니다.
      </p>

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
          <div className="relative w-[150px] h-[240px]">
            <Image
              src="/icons/etc/시즌베스트.png" // 또는 "/시즌베스트.png"
              alt="All Season Best"
              fill
              className="object-contain"
            />
          </div>
            {/* 🥇 최고 랭크 출력 텍스트 */}
            {userBestRank !== null && (
              <div className="absolute top-4/9 w-[150px] text-center text-white text-6xl drop-shadow-[0_0_4px_rgba(255,0,0,1)]">
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
                playerScores={playerScoresMap.get(selectedUser) || null} // ✅ 추가
                summaryData={userSummaryData}  // ✅ 추가
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
      {selectedUser && (
        <div className="mt-8">
          <UserFullHistory selectedUser={selectedUser} />
          <UserStatsSection selectedUser={selectedUser} />
        </div>
      )}
    </div>
  );
}
