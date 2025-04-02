"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

// GAS API에서 랭킹 데이터 가져오기
async function fetchLeaderboard() {
  const response = await fetch("/api/gasApi?action=getLeaderboard");
  if (!response.ok) {
    throw new Error("Failed to fetch leaderboard");
  }
  const data = await response.json();
  //console.log("📊 가져온 랭킹 데이터:", data); // ✅ 데이터 확인
  return data;
}

async function fetchSeasonList() {
  const response = await fetch("/api/gasApi?action=getSeasonList");
  if (!response.ok) {
    throw new Error("시즌 정보를 가져오는 데 실패했습니다.");
  }
  const data = await response.json();
  //console.log("📅 가져온 시즌 리스트:", data);
  return data;
}

async function fetchHistoryData() {
  const response = await fetch("/api/gasApi?action=getHistoryData");
  if (!response.ok) throw new Error("히스토리 데이터를 불러오지 못했습니다.");
  const data = await response.json();
  //console.log("📜 전체 히스토리:", data);
  return data;
}

async function fetchSeasonPrevRank() {
  const res = await fetch("/api/gasApi?action=getSeasonPrevRank");
  const data = await res.json();
  return data; // [{ PLAYER: "야로", PrevRank: 20 }, ...]
}

// ✅ 날짜의 시간 요소를 제거 (오직 날짜만 비교용)
function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

// ✅ 날짜 유효성 확인
function isValidDate(d) {
  return d instanceof Date && !isNaN(d.getTime());
}

// ✅ TIMESTAMP를 Safari 포함 모든 브라우저에서 파싱 가능하게
function parseTimestampToDate(raw) {
  if (!raw) return null;

  // 이미 Date 객체면 그대로
  if (raw instanceof Date) return raw;

  // Safari 호환을 위해 '-' 사용 불가 시 '.'을 '/'로 바꿔줌
  const isKoreanFormat = typeof raw === "string" && raw.includes("오전") || raw.includes("오후");

  if (isKoreanFormat) {
    try {
      const matched = raw.match(/^(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\s*(오전|오후)\s*(\d{1,2}):(\d{2}):(\d{2})$/);
      if (!matched) {
        return null;
      }

      let [_, year, month, day, ampm, hour, minute, second] = matched;
      hour = parseInt(hour, 10);
      if (ampm === "오후" && hour < 12) hour += 12;
      if (ampm === "오전" && hour === 12) hour = 0;

      const iso = `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${String(hour).padStart(2, "0")}:${minute}:${second}`;
      const parsed = new Date(iso);

      if (isNaN(parsed.getTime())) {
        return null;
      }

      return parsed;
    } catch (e) {
      return null;
    }
  }

  // ISO 포맷은 그대로 Date 생성
  try {
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  } catch (e) {
    return null;
  }
}


function filterHistoryBySeason(historyData, selectedSeason) {
  const start = stripTime(new Date(selectedSeason.START_TIME));
  const end = stripTime(new Date(selectedSeason.END_TIME));

  //console.log("🟩 시즌 범위:", start.toISOString(), "~", end.toISOString());

  return historyData.filter(entry => {
    const parsed = parseTimestampToDate(entry.TIMESTAMP);

    if (!isValidDate(parsed)) {
      console.warn("❌ Invalid TIMESTAMP:", entry.TIMESTAMP);
      return false;
    }

    const dateOnly = stripTime(parsed);
    const isInRange = dateOnly >= start && dateOnly <= end;

    return isInRange;
  });
}


function calculateRanking(filteredHistory) {
  const stats = {}; // 플레이어별 데이터

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

      // 클래스별 승수 추가
      if (cls === "드") stats[username].druidWins += 1;
      else if (cls === "어") stats[username].oracleWins += 1;
      else if (cls === "넥") stats[username].necroWins += 1;
      else if (cls === "슴") stats[username].summonerWins += 1;
    }
  });

  // 객체 → 배열로 변환
  let players = Object.values(stats);

  // 정렬: 총 승수 내림차순, 동점 시 아이디 오름차순 (한글)
  players.sort((a, b) => {
    if (b.wins === a.wins) {
      return a.username.localeCompare(b.username, "ko");
    }
    return b.wins - a.wins;
  });

  // 동순위 처리
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

export default function HomePage() {
  const [season, setSeason] = useState("25년 3월 시즌");
  const [leaderboard, setLeaderboard] = useState([]);
  const [seasonList, setSeasonList] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // ✅ 로딩 상태 별도 관리
  const [showPopup, setShowPopup] = useState(false);


  const router = useRouter();

  /*
  useEffect(() => {
    fetchLeaderboard()
      .then((data) => {
        if (data.players) {
          setLeaderboard(data.players.map(player => ({
            rank: player.rank,
            prevRank: player.prevRank,
            username: player.username,
            wins: player.wins || 0,
            druidWins: player.druidWins || 0,
            oracleWins: player.oracleWins || 0,
            necroWins: player.necroWins || 0,
            summonerWins: player.summonerWins || 0,
          })));
        }
      })
      .catch((error) => console.error("Error fetching leaderboard:", error));
  }, []);*/

  // app/page.js 또는 HomePage 컴포넌트 내부
  useEffect(() => {
    openPopup();
  }, []);
  
  function openPopup() {
    // 첫 번째 팝업: 왼쪽 상단
    window.open(
      "/popup1",
      "popup1",
      "width=509,height=669,left=0,top=0,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no"
    );
  
    // 두 번째 팝업: 첫 번째 오른쪽에 나란히
    window.open(
      "/popup2",
      "popup2",
      "width=497,height=600,left=509,top=0,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no"
    );
  }
  
  useEffect(() => {
    fetchSeasonList().then((data) => {
      setSeasonList(data);
      if (data.length > 0) {
        const latest = data[data.length - 1]; // ✅ 마지막 항목 선택
        setSelectedSeason(latest);
      }
    });
  }, []);

  const isCurrentSeason = selectedSeason?.TITLE === seasonList.at(-1)?.TITLE;

  
  useEffect(() => {
    if (!selectedSeason) return;
  
    setIsLoading(true);
  
    Promise.all([fetchHistoryData(), fetchSeasonPrevRank()])
      .then(([history, prevRankData]) => {
        const filtered = filterHistoryBySeason(history, selectedSeason);
        const ranked = calculateRanking(filtered);
  
        // 🎯 prevRank 병합
        const merged = ranked.map(player => {
          const match = prevRankData.find(p => p.PLAYER === player.username);
          return {
            ...player,
            prevRank: match ? Number(match.PrevRank) : player.rank, // 기본값: 현재와 동일
          };
        });
  
        setLeaderboard(merged);
        setIsLoading(false);
      });
  }, [selectedSeason]);

  // 👇 이건 .map() 위쪽에 추가해줘 (JSX 밖에서)
  const filteredPlayers = leaderboard.filter((player) => player.rank <= 20);
  const fiveWinsOrMore = filteredPlayers.filter((player) => player.wins >= 5);
  const oneWinOrMore = filteredPlayers.filter((player) => player.wins >= 1);

  const playersToDisplay = fiveWinsOrMore.length >= 20 ? fiveWinsOrMore : oneWinOrMore;
  
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* 네비게이션 바 */}
      <nav className="flex justify-start items-center space-x-6 bg-gray-800 p-2 rounded-lg shadow-md text-lg font-bold tracking-widest pl-4">
          {/* 로고 */}
          <div className="relative w-12 h-12">
          <Image src="/icons/logo.png" alt="Logo" fill className="object-contain" />
          </div>
          
          {/* 네비게이션 버튼 */}
          {[
            { name: "home", path: "/" },
            { name: "history", path: "/history" },
            { name: "user", path: "/user" },
            { name: "rule", path: "/rule" },
            { name: "setting", path: "/setting" }, // Ready 버튼 추가
            { name: "ready", path: "/ready" } // Ready 버튼 추가
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

      {/* 타이틀 영역 */}
      {/*<h1 className="text-center text-4xl font-bold mt-6 mb-4">69 내전기록실</h1>*/}
      <h1 className="text-center text-2xl md:text-4xl font-bold mt-6 mb-4">69 내전기록실</h1>
      
      {/*<div className="relative w-full h-60">*/}
      <div className="relative w-full h-40 md:h-60">

        <Image 
          src="/icons/banner.png" 
          alt="길드 로고" 
          fill 
          className="object-contain rounded-lg" 
        />
      </div>
      
      {/* 순위표 영역 */}
      {/*<div className="mt-8 bg-gray-800 p-8 rounded-lg max-w-5xl mx-auto">*/}
      <div className="mt-8 bg-gray-800 p-8 rounded-lg max-w-3xl mx-auto overflow-x-auto">

        <h2 className="text-center text-xl font-semibold">🏆 Ranking</h2>
        {/* 시즌 선택 드롭다운 (테이블 기준 정렬) */}
        <div className="max-w-3xl mx-auto flex justify-end">
        {seasonList.length > 0 && selectedSeason && (
          <select
            className="bg-gray-800 text-white p-2 rounded"
            value={selectedSeason.TITLE}
            onChange={(e) => {
              const selected = seasonList.find((s) => s.TITLE === e.target.value);
              setSelectedSeason(selected);
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
        {/*<table className="w-full border-collapse border border-gray-700 text-center">*/}
        <table className="table-auto w-full border-collapse border border-gray-700 text-sm md:text-base text-center">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-800">
              <th className="px-5 py-3 border-r border-gray-600 text-center whitespace-nowrap">순위</th>
              <th className="px-5 py-3 border-r border-gray-600 text-center whitespace-nowrap">변동</th>
              <th className="px-5 py-3 border-r border-gray-600 text-center whitespace-nowrap">아이디</th>
              <th className="px-5 py-3 border-r border-gray-600 text-center whitespace-nowrap">총 승수</th>
              <th className="px-5 py-3 text-center whitespace-nowrap">클래스별 승수</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // ✅ 데이터 로딩 중
              <tr>
                <td colSpan="5" className="text-center py-6 text-gray-400">
                  🚀 랭킹 데이터를 불러오는 중입니다...
                </td>
              </tr>
            ) : leaderboard.length === 0 ? (
              // ✅ 필터링 결과 없음
              <tr>
                <td colSpan="5" className="text-center py-6 text-gray-400">
                  😢 해당 시즌에는 조건을 만족하는 랭킹 유저가 없습니다.
                </td>
              </tr>
            ) : (
              // ✅ 정상 랭킹 출력
              playersToDisplay.map((player) => (
                <tr
                  key={player.username}
                  className={`border-b border-gray-700 text-sm text-center ${
                    player.rank <= 3 ? "text-yellow-400 font-bold" : "text-white"
                  } hover:bg-gray-700 transition duration-200`}
                >
                  <td className="px-3 py-3 border-r border-gray-600 whitespace-nowrap text-lg font-semibold">
                    {player.rank <= 3 ? (
                      <div className="relative w-12 h-12 mx-auto">
                        <Image
                          src={`/icons/rank/${player.rank}.png`}
                          alt={`Rank ${player.rank}`}
                          fill
                          className="object-contain"
                        />
                      </div>
                    ) : (
                      player.rank
                    )}
                  </td>
                  <td className="px-6 py-3 border-r border-gray-600 whitespace-nowrap">
                    <div className="relative w-6 h-6 mx-auto">
                      <Image
                        src={getRankChangeIcon(
                          player.rank,
                          player.prevRank ?? player.rank,
                          isCurrentSeason
                        )}
                        alt="변동"
                        fill
                        className="object-contain"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2 flex md:flex-row items-center space-x-3 border-r border-gray-600 whitespace-nowrap">
                    <UserProfileImage username={player.username} />
                    <span className="text-lg font-medium">{player.username}</span>
                  </td>
                  <td className="px-6 py-3 text-lg font-semibold border-r border-gray-600 whitespace-nowrap">
                    {player.wins}
                  </td>
                  <td className="px-4 py-2 flex flex-wrap justify-start space-x-2 md:space-x-4 whitespace-nowrap">
                    {player.druidWins > 0 && (
                      <div className="flex items-center space-x-2">
                        <ClassIcon src="/icons/classes/druid.jpg" alt="Druid" />
                        <span className="text-1xl">{player.druidWins}</span>
                      </div>
                    )}
                    {player.oracleWins > 0 && (
                      <div className="flex items-center space-x-2">
                        <ClassIcon src="/icons/classes/oracle.jpg" alt="Oracle" />
                        <span className="text-1xl">{player.oracleWins}</span>
                      </div>
                    )}
                    {player.necroWins > 0 && (
                      <div className="flex items-center space-x-2">
                        <ClassIcon src="/icons/classes/necro.jpg" alt="Necro" />
                        <span className="text-1xl">{player.necroWins}</span>
                      </div>
                    )}
                    {player.summonerWins > 0 && (
                      <div className="flex items-center space-x-2">
                        <ClassIcon src="/icons/classes/summoner.jpg" alt="Summoner" />
                        <span className="text-1xl">{player.summonerWins}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ✅ 유저 프로필 이미지 컴포넌트 (onError 처리)
function UserProfileImage({ username }) {
  const [imgSrc, setImgSrc] = useState(`/icons/users/웹_${username}.jpg`);

  return (
    <div className="relative w-10 h-10 overflow-hidden">
      <Image 
        src={imgSrc} 
        alt={username} 
        fill 
        className="object-contain" 
        onError={() => setImgSrc("/icons/users/default.png")} // 기본 이미지 처리
      />
    </div>
  );
}

// ✅ 클래스 아이콘 컴포넌트 (onError 필요 없음)
function ClassIcon({ src, alt }) {
  return (
    <div className="relative w-10 h-10">
      <Image src={src} alt={alt} fill className="object-contain" />
    </div>
  );
}

function getRankChangeIcon(current, prev, isCurrentSeason = true) {
  if (!isCurrentSeason) return "/icons/rank/same.png";

  const currentRank = Number(current);
  const previousRank = Number(prev);

  //console.log(`👉 비교(Number): 현재 ${currentRank}, 이전 ${previousRank}`);

  if (currentRank < previousRank) return "/icons/rank/up.png";
  if (currentRank > previousRank) return "/icons/rank/down.png";
  return "/icons/rank/same.png";
}

