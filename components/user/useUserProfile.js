"use client";

// user / user-popup 페이지가 공유하는 프로필 데이터 로딩 로직.
// 두 페이지에 그대로 복제돼 있던 useState/useEffect 뭉치를 한곳으로 모았다.

import { useEffect, useState } from "react";
import { gasGet } from "@/lib/gasClient";

async function fetchSeasonList() {
  const response = await fetch("/api/gasApi?action=getSeasonList");
  if (!response.ok) throw new Error("시즌 정보를 가져오는 데 실패했습니다.");
  return await response.json();
}

async function fetchUserSummary() {
  const response = await fetch("/api/gasApi?action=getUserSummary");
  if (!response.ok) throw new Error("요약 데이터를 가져오지 못했습니다.");
  return await response.json();
}

async function fetchSeasonPrevRank() {
  return gasGet("getSeasonPrevRank");
}

async function fetchUserDuoStats() {
  return gasGet("getUserDuoStats");
}

async function fetchRecentGames() {
  return gasGet("getRecentGames");
}

async function fetchPlayerScores() {
  return gasGet("getPlayerScores");
}

async function fetchLeaderboardForAllSeason() {
  const response = await fetch("/api/gasApi?action=getLeaderboard");
  if (!response.ok) throw new Error("Failed to fetch leaderboard");

  const data = await response.json();
  if (!data.players) {
    console.error("⚠️ GAS 응답에 players 없음:", data);
    return { players: [] };
  }
  return data;
}

/**
 * @param {string|null} selectedUser 조회 대상 유저
 * @param {string|null} [initialSeasonTitle] 초기 선택 시즌(URL 등). 없으면 "ALL"
 */
export function useUserProfile(selectedUser, initialSeasonTitle = null) {
  const [seasonList, setSeasonList] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [isSeasonStatsLoading, setIsSeasonStatsLoading] = useState(true);
  const [duoStats, setDuoStats] = useState([]);
  const [recentGames, setRecentGames] = useState([]);
  const [userSummaryData, setUserSummaryData] = useState([]);
  const [userBestRank, setUserBestRank] = useState(null);
  const [seasonStats, setSeasonStats] = useState(null);
  const [recentGamesRendered, setRecentGamesRendered] = useState(false);
  const [awardsRendered, setAwardsRendered] = useState(false);
  const [allGames, setAllGames] = useState([]);
  const [playerScoresMap, setPlayerScoresMap] = useState(new Map());

  // 시즌 목록 로드 + 초기 시즌 선택 (URL season 우선, 없으면 ALL)
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSeasonList();
        const allOption = { TITLE: "ALL", START_TIME: null, END_TIME: null };
        const fullList = [allOption, ...data];
        setSeasonList(fullList);

        let defaultSeason = allOption;
        if (initialSeasonTitle) {
          const found = fullList.find((s) => s.TITLE === initialSeasonTitle);
          if (found) defaultSeason = found;
        }
        setSelectedSeason(defaultSeason);
      } catch (err) {
        console.error("❌ 시즌 목록 불러오기 실패:", err);
        setSeasonList([{ TITLE: "ALL" }]);
        setSelectedSeason({ TITLE: "ALL" });
      }
    })();
  }, [initialSeasonTitle]);

  // 시즌 변경만 감지해서 fetch (ALL 시즌 전용 경로)
  useEffect(() => {
    if (!selectedSeason || !selectedUser) return;

    if (selectedSeason.TITLE === "ALL") {
      setIsSeasonStatsLoading(true);

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
            setSeasonStats([]);
          }
        })
        .catch((err) => {
          console.error("❌ ALL 시즌 fetch 실패", err);
          setSeasonStats([]);
        })
        .finally(() => {
          setIsSeasonStatsLoading(false);
        });
    }
  }, [selectedSeason, selectedUser]);

  useEffect(() => {
    fetchPlayerScores()
      .then(({ players }) => {
        const m = new Map(players.map((p) => [p.PLAYER.trim(), p]));
        setPlayerScoresMap(m);
      })
      .catch((err) => console.error("❌ getPlayerScores 실패:", err));
  }, []);

  useEffect(() => {
    fetchUserSummary().then(setUserSummaryData);
  }, []);

  useEffect(() => {
    if (!selectedSeason || userSummaryData.length === 0) return;

    setIsSeasonStatsLoading(true);

    fetchSeasonPrevRank()
      .then((prevRankList) => {
        const filtered = userSummaryData.filter((user) => user.SEASON === selectedSeason.TITLE);

        const prevMap = new Map(
          prevRankList
            .filter((p) => p.SEASON === selectedSeason.TITLE)
            .map((p) => [p.PLAYER.trim(), p])
        );

        const merged = filtered.map((user) => {
          const prev = prevMap.get(user.PLAYER.trim()) || {};

          return {
            ...user,
            D_PREV_RANK: prev.D_PREV_RANK,
            A_PREV_RANK: prev.A_PREV_RANK,
            N_PREV_RANK: prev.N_PREV_RANK,
            S_PREV_RANK: prev.S_PREV_RANK,
            TOTAL_PREV_RANK: prev.PrevRank,
          };
        });

        setSeasonStats(merged);
        setIsSeasonStatsLoading(false);
      })
      .catch((err) => {
        console.error("❌ 시즌 이전 랭크 가져오기 실패:", err);
        setIsSeasonStatsLoading(false);
      });
  }, [selectedSeason, userSummaryData]);

  useEffect(() => {
    if (!selectedUser || userSummaryData.length === 0 || seasonList.length === 0) return;

    const now = new Date();

    const endedSeasons = new Set(
      seasonList
        .filter((season) => {
          const endDate = season.END_TIME ? new Date(season.END_TIME) : null;
          return endDate && endDate < now;
        })
        .map((season) => season.TITLE)
    );

    const ranks = userSummaryData
      .filter((row) => row.PLAYER === selectedUser && endedSeasons.has(row.SEASON))
      .map((row) => Number(row.TOTAL_RANK))
      .filter((rank) => !isNaN(rank));

    setUserBestRank(ranks.length ? Math.min(...ranks) : null);
  }, [selectedUser, userSummaryData.length, seasonList.length]);

  useEffect(() => {
    if (!selectedUser || !selectedSeason?.TITLE || seasonList.length === 0) return;

    fetchUserDuoStats().then((data) => {
      let filtered = data.filter(
        (row) => selectedSeason.TITLE === "ALL" || row.SEASON === selectedSeason.TITLE
      );

      if (selectedSeason.TITLE === "ALL") {
        const filteredAll = data
          .filter(
            (row) =>
              row.SEASON === "ALL" &&
              (row.PLAYER1 === selectedUser || row.PLAYER2 === selectedUser)
          )
          .filter((row) => row.WINS > 0)
          .map((row) => ({
            partner: row.PLAYER1 === selectedUser ? row.PLAYER2 : row.PLAYER1,
            WINS: row.WINS,
            DUO_RANK: row.DUO_RANK,
          }))
          .sort((a, b) => b.WINS - a.WINS)
          .slice(0, 5);

        setDuoStats(filteredAll);
      } else {
        const processed = filtered
          .filter(
            (row) =>
              (row.PLAYER1 === selectedUser || row.PLAYER2 === selectedUser) && row.WINS > 0
          )
          .map((row) => ({
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
      const userGames = data.filter((row) => row.PLAYER === selectedUser);

      const recent = Array.from(
        new Map(
          userGames
            .sort((a, b) => new Date(b.DATETIME) - new Date(a.DATETIME))
            .map((game) => [game.DATETIME + game.CLASS_USED, game])
        ).values()
      ).slice(0, 5);

      setRecentGames(recent);
      setAllGames(userGames);
    });
  }, [selectedUser]);

  useEffect(() => {
    // 유저나 시즌이 바뀔 때마다 이전 시즌 기록 초기화
    setSeasonStats(null);
  }, [selectedUser, selectedSeason]);

  useEffect(() => {
    if (recentGames?.length && !recentGamesRendered) {
      setRecentGamesRendered(true);
    }
  }, [recentGames, recentGamesRendered]);

  useEffect(() => {
    if (userSummaryData?.length && !awardsRendered) {
      setAwardsRendered(true);
    }
  }, [userSummaryData, awardsRendered]);

  return {
    seasonList,
    selectedSeason,
    setSelectedSeason,
    isSeasonStatsLoading,
    duoStats,
    recentGames,
    userSummaryData,
    userBestRank,
    seasonStats,
    recentGamesRendered,
    awardsRendered,
    allGames,
    playerScoresMap,
  };
}
