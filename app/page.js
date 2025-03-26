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
  console.log("📊 가져온 랭킹 데이터:", data); // ✅ 데이터 확인
  return data;
}

export default function HomePage() {
  const [season, setSeason] = useState("25년 3월 시즌");
  const [leaderboard, setLeaderboard] = useState([]);
  const router = useRouter();

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
  }, []);

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
                if (path === "/ready" || path === "/" || path === "/rule") {
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
          <select 
            className="bg-gray-800 text-white p-2 rounded"
            value={season}
            onChange={(e) => setSeason(e.target.value)}
          >
            <option>25년 3월 시즌</option>
            <option>25년 2월 시즌</option>
            <option>25년 1월 시즌</option>
          </select>
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
            {leaderboard.length > 0 ? (
              leaderboard
              .filter(player => player.wins >= 5 && player.rank <= 20).map((player, index) => (
                <tr 
                  key={player.username} 
                  className={`border-b border-gray-700 text-sm text-center ${
                    player.rank <= 3 ? "text-yellow-400 font-bold" : "text-white"
                  } hover:bg-gray-700 transition duration-200`}
                >
                  <td className="px-3 py-3 border-r border-gray-600 whitespace-nowrap">
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
                  {/*<td className="px-6 py-3 flex justify-start items-center space-x-3 border-r border-gray-600 pl-15">*/}
                  <td className="px-6 py-3 border-r border-gray-600 whitespace-nowrap">
                    <div className="relative w-6 h-6 mx-auto">
                      <Image 
                        src={getRankChangeIcon(player.rank, player.prevRank)} 
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
                  <td className="px-6 py-3 text-lg font-semibold border-r border-gray-600 whitespace-nowrap">{player.wins}</td>
                  {/*<td className="px-6 py-3 flex justify-start space-x-4 pl-30">*/}
                  {/*<td className="px-4 py-2 flex flex-col md:flex-row items-center space-x-3 border-r border-gray-600">*/}
                  <td className="px-4 py-2 flex flex-wrap justify-start space-x-2 md:space-x-4 whitespace-nowrap">

                    {player.druidWins > 0 && (
                      <div className="flex items-center space-x-2">
                        <ClassIcon src="/icons/classes/druid.jpg" alt="Druid" />
                        <span className="text-lg">{player.druidWins}</span>
                      </div>
                    )}
                    {player.oracleWins > 0 && (
                      <div className="flex items-center space-x-2">
                        <ClassIcon src="/icons/classes/oracle.jpg" alt="Oracle" />
                        <span className="text-lg">{player.oracleWins}</span>
                      </div>
                    )}
                    {player.necroWins > 0 && (
                      <div className="flex items-center space-x-2">
                        <ClassIcon src="/icons/classes/necro.jpg" alt="Necro" />
                        <span className="text-lg">{player.necroWins}</span>
                      </div>
                    )}
                    {player.summonerWins > 0 && (
                      <div className="flex items-center space-x-2">
                        <ClassIcon src="/icons/classes/summoner.jpg" alt="Summoner" />
                        <span className="text-lg">{player.summonerWins}</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center p-6">🚀 랭킹 데이터를 불러오는 중...</td>
              </tr>
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

function getRankChangeIcon(current, prev) {
  console.log(`👉 비교: 현재 ${current}, 이전 ${prev}`);

  const currentRank = Number(current);
  const previousRank = Number(prev);

  console.log(`👉 비교(Number): 현재 ${currentRank}, 이전 ${previousRank}`);

  if (currentRank < previousRank) return "/icons/rank/up.png";
  if (currentRank > previousRank) return "/icons/rank/down.png";
  return "/icons/rank/same.png";
}

