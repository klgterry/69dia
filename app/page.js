"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

async function fetchSeasonList() {
  const response = await fetch("/api/gasApi?action=getSeasonList");
  if (!response.ok) {
    throw new Error("시즌 정보를 가져오는 데 실패했습니다.");
  }
  const data = await response.json();
  //console.log("📅 가져온 시즌 리스트:", data);
  return data;
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

export default function HomePage() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [seasonList, setSeasonList] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // ✅ 로딩 상태 별도 관리

  const router = useRouter();

  // app/page.js 또는 HomePage 컴포넌트 내부
  /*useEffect(() => {
    openPopup();
  }, []);
  
  function openPopup() {
    const isMobile = window.innerWidth <= 768; // 또는 userAgent 체크도 가능
  
    if (isMobile) {
        return;
    } else {
      // 데스크탑용 기본 팝업
      /*window.open(
        "/popup1",
        "popup3",
        "width=509,height=800,left=0,top=0,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no"
      );*/

      /*window.open(
        "/popup2",
        "popup4",
        "width=406,height=406,left=509,top=0,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no"
      );*/

    //}
  //}
    
  /*useEffect(() => {
    fetchSeasonList().then((data) => {
      setSeasonList(data);
      if (data.length > 0) {
        const latest = data[data.length - 1]; // ✅ 마지막 항목 선택
        setSelectedSeason(latest);
      }
    });
  }, []);*/

  useEffect(() => {
    const staticSeasonList = [
      { TITLE: "25. 3월 시즌" },
      { TITLE: "25. 4월 시즌1" },
      { TITLE: "25. 4월 시즌2" },
      { TITLE: "25. 5월 시즌" },
      { TITLE: "25. 6월 시즌" },
      { TITLE: "25. 7월 시즌" },
      { TITLE: "25. 8월 시즌" },
      { TITLE: "25. 9월 시즌" },
      { TITLE: "25. 10월 시즌" },
      { TITLE: "25. 11월 시즌" },
      { TITLE: "25. 12월 시즌" },
      { TITLE: "26. 1월 시즌" },
      { TITLE: "26. 2월 시즌" },
      { TITLE: "26. 3월 시즌" },
    ];

    setSeasonList(staticSeasonList);
    setSelectedSeason(staticSeasonList[staticSeasonList.length - 1]);
  }, []);

  const isCurrentSeason = selectedSeason?.TITLE === seasonList.at(-1)?.TITLE;
  
  useEffect(() => {
  if (!selectedSeason || seasonList.length === 0) return;

  setIsLoading(true);

  const isLatestSeason = selectedSeason.TITLE === seasonList.at(-1)?.TITLE;

  const summaryPromise = isLatestSeason
    ? fetch("/api/gasApi?action=getCurrentSeasonSummary").then(res => res.json())
    : fetchUserSummary();

  Promise.all([summaryPromise, fetchSeasonPrevRank()])
    .then(([summary, prevRankList]) => {
      const seasonUsers = isLatestSeason
        ? summary // 이미 필터링된 최신 시즌 데이터
        : summary.filter(user => user.SEASON === selectedSeason.TITLE);

      // 병합: prevRank
      const merged = seasonUsers.map(user => {
        const rating = user.RATING_5PT === "-" ? null : Number(user.RATING_5PT);
        const prev = prevRankList.find(p => p.SEASON === user.SEASON && p.PLAYER === user.PLAYER);
        return {
          username: user.PLAYER,
          wins: Number(user.TOTAL_WINS),
          druidWins: Number(user.D_WINS || 0),
          oracleWins: Number(user.A_WINS || 0),
          necroWins: Number(user.N_WINS || 0),
          summonerWins: Number(user.S_WINS || 0),
          rank: Number(user.TOTAL_RANK),
          prevRank: prev ? Number(prev.PrevRank) : Number(user.TOTAL_RANK),
          rating,
        };
      });

      // 정렬: 승수 기준
      merged.sort((a, b) => {
        if (b.wins === a.wins) {
          return a.username.localeCompare(b.username, "ko");
        }
        return b.wins - a.wins;
      });

      setLeaderboard(merged);
      setIsLoading(false);
    })
    .catch((err) => {
      console.error("🚨 데이터 로딩 실패:", err);
      setIsLoading(false);
    });
}, [selectedSeason, seasonList]);

  
  // 👇 이건 .map() 위쪽에 추가해줘 (JSX 밖에서)
  const filteredPlayers = leaderboard.filter((player) => player.rank <= 30);
  //const fiveWinsOrMore = filteredPlayers.filter((player) => player.wins >= 5);
  const oneWinOrMore = filteredPlayers.filter((player) => player.wins >= 1);

  //const playersToDisplay = fiveWinsOrMore.length >= 20 ? fiveWinsOrMore : oneWinOrMore;
  const playersToDisplay = oneWinOrMore;
  
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
      {/* 타이틀 영역 */}     
      {/*<div className="relative w-full h-60">*/}
      <div className="w-full flex justify-center mt-10">
        <Image 
          src="/icons/banner.png" 
          alt="길드 로고"
          width={0}
          height={0}
          sizes="100vw"
          className="w-full max-w-[770px] h-auto object-contain rounded-lg"
        />
      </div>
      
      {/* 순위표 영역 */}
      {/*<div className="mt-8 bg-gray-800 p-8 rounded-lg max-w-5xl mx-auto">*/}
      <div className="mt-8 bg-gray-800 p-8 rounded-lg max-w-3xl mx-auto overflow-x-auto">

        <div className="flex justify-center -mt-5">
          <img
            src="/images/ranking.jpg" // ⛳ public 디렉토리에 저장된 위치 기준!
            alt="Ranking 타이틀 배너"
            className="w-[250px] h-auto" // 원하는 너비로 조정
          />
        </div>

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
              <th className="px-3 py-3 border-r border-gray-600 text-center whitespace-nowrap">승수</th>
              <th className="px-6 py-3 border-r border-gray-600 text-center whitespace-nowrap">평점</th>
              <th className="px-5 py-3 text-center whitespace-nowrap">클래스별 승수</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // ✅ 데이터 로딩 중
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-400">
                  🚀 랭킹 데이터를 불러오는 중입니다...
                </td>
              </tr>
            ) : leaderboard.length === 0 ? (
              // ✅ 필터링 결과 없음
              <tr>
                <td colSpan="6" className="text-center py-6 text-gray-400">
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
                      <div className="relative w-10 h-10 mx-auto">
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
                    <div className="relative w-4 h-4 mx-auto">
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
                  <td className="px-4 py-2 border-r border-gray-600 whitespace-nowrap">
                    <div className="flex md:flex-row items-center space-x-3">
                      <UserProfileImage username={player.username} />
                      <span
                        className="text-sm font-medium cursor-pointer hover:underline"
                        onClick={() => {
                          const popupUrl = `/user-popup?name=${encodeURIComponent(player.username)}&season=${encodeURIComponent(selectedSeason?.TITLE || "")}`;
                          window.open(popupUrl, "userPopup", "width=900,height=800,left=100,top=100,toolbar=no,location=no,status=no,menubar=no,scrollbars=no,resizable=no");
                        }}
                      >
                        {player.username}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm font-semibold border-r border-gray-600 whitespace-nowrap">
                    {player.wins}
                  </td>
                  <td className="px-4 py-2 border-r border-gray-600 whitespace-nowrap text-sm font-semibold">
                     {player.rating !== null ? (
                      <>
                        <img
                          src={
                            player.rating === 5.0
                              ? "/images/무지개별.png"
                              : player.rating >= 4.0
                              ? "/images/금별.png"
                              : "/images/은별.png"
                          }
                          alt="rating-star"
                          className="inline w-5 h-5 mr-2 -mt-0.5" // 크기/간격 조정
                        />
                        {player.rating.toFixed(1)}
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-4 py-2 border-gray-600 whitespace-nowrap border-l">
                    <div className="flex flex-wrap justify-start space-x-1 md:space-x-3">
                      {player.druidWins > 0 && (
                        <div className="flex items-center space-x-1">
                          <ClassIcon src="/icons/classes/druid.jpg" alt="Druid" />
                          <span className="text-1xl">{player.druidWins}</span>
                        </div>
                      )}
                      {player.oracleWins > 0 && (
                        <div className="flex items-center space-x-1">
                          <ClassIcon src="/icons/classes/oracle.jpg" alt="Oracle" />
                          <span className="text-1xl">{player.oracleWins}</span>
                        </div>
                      )}
                      {player.necroWins > 0 && (
                        <div className="flex items-center space-x-1">
                          <ClassIcon src="/icons/classes/necro.jpg" alt="Necro" />
                          <span className="text-1xl">{player.necroWins}</span>
                        </div>
                      )}
                      {player.summonerWins > 0 && (
                        <div className="flex items-center space-x-1">
                          <ClassIcon src="/icons/classes/summoner.jpg" alt="Summoner" />
                          <span className="text-1xl">{player.summonerWins}</span>
                        </div>
                      )}
                    </div>
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
    <div className="relative w-8 h-8 overflow-hidden">
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
    <div className="relative w-8 h-8">
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


