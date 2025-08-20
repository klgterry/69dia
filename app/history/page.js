"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import DuoBalance from "@/components/DuoBalance";

// 클래스명 매핑 (Main 페이지와 동일한 아이콘 파일명 사용)
const classIconMap = {
  "드": "druid",
  "어": "oracle",
  "넥": "necro",
  "슴": "summoner"
};

async function fetchHistoryGames() {
  const response = await fetch("/api/gasApi?action=getHistoryGames");
  if (!response.ok) throw new Error("Failed to fetch history games");
  return await response.json();
}

// GAS API에서 게임 이력 데이터 가져오기
async function fetchGameHistory() {
  const response = await fetch("/api/gasApi?action=getGameHistory");
  if (!response.ok) {
    throw new Error("Failed to fetch game history");
  }
  const data = await response.json();
  console.log("📜 가져온 게임 이력 데이터:", data); // ✅ 데이터 확인
  return data;
}

async function fetchUserList() {
  const response = await fetch("/api/gasApi?action=getFilteredUsers");
  if (!response.ok) throw new Error("Failed to fetch user list");
  return await response.json();
}

async function fetchSeasonList() {
  const response = await fetch("/api/gasApi?action=getSeasonList");
  if (!response.ok) throw new Error("Failed to fetch season list");
  return await response.json();
}

async function fetchUserDuoStats() {
  const res = await fetch("/api/gasApi?action=getUserDuoStats");
  const data = await res.json();
  return data;
}

export default function HistoryPage() {
  const [gameHistory, setGameHistory] = useState([]);
  const [games, setGames] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetchHistoryGames()
      .then((data) => setGames(data.games || []))
      .catch((err) => console.error("Error fetching history games:", err));
  }, []);

  useEffect(() => {
    fetchGameHistory()
      .then((data) => {
        if (data.games) {
          setGameHistory(data.games.slice(0, 5)); // 🔥 최근 10개만 표시
        }
      })
      .catch((error) => console.error("Error fetching game history:", error));
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
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
      {/* 게임 이력 테이블 */}
      <div
        className="relative w-[900px] h-[400px] bg-center bg-no-repeat bg-contain p-6 rounded-lg mx-auto mt-10"
        style={{
          backgroundImage: "url('/icons/bg/recent_games_bg.png')", // ✅ 배경 이미지 적용
          backgroundSize: "900px 400px", // ✅ 너비와 높이를 명시
        }}
      >
        <h3 className="text-4xl font-bold text-white mb-4 text-center drop-shadow-sm mt-5">📜 최근 5경기 전체 이력</h3>

        <table className="w-full border-collapse border border-gray-700 text-center text-sm bg-transparent">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="p-2 text-white text-sm">게임 번호</th>
              <th className="p-2 text-white text-sm">승리 팀</th>
              <th className="p-2 text-white text-sm">VS</th>
              <th className="p-2 text-white text-sm">패배 팀</th>
            </tr>
          </thead>
          <tbody>
            {gameHistory.length > 0 ? (
              gameHistory.map((game) => (
                <tr key={game.gameId} className="border-b border-gray-700">
                  {/* 게임 번호 */}
                  <td className="p-2 text-gray-200 text-sm">{game.gameId}</td>

                  {/* ✅ 승리 팀 */}
                  <td className="p-2 pl-5">
                    <div className="flex flex-wrap justify-start gap-x-4 min-w-[240px]">
                      {game.winningPlayers.map((player) => (
                        <div
                          key={player.username}
                          className="flex items-center gap-2 w-[65px]" // 👈 고정 너비로 수직 정렬 유지
                        >
                          <div className="relative w-6 h-6 shrink-0">
                            <Image
                              src={`/icons/classes/${classIconMap[player.class]}.jpg`}
                              alt={player.class}
                              fill
                              className="object-contain"
                            />
                          </div>
                          <span className="text-green-300 text-sm whitespace-nowrap">
                            {player.username}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>

                  {/* VS */}
                  <td className="p-2 font-bold text-white align-middle text-sm">VS</td>

                  {/* ✅ 패배 팀 */}
                  <td className="p-2 pl-5">
                    <div className="flex flex-wrap justify-start gap-x-4 min-w-[240px]">
                      {game.losingPlayers.map((player) => (
                        <div
                          key={player.username}
                          className="flex items-center gap-2 w-[65px]" // 👈 동일하게 정렬
                        >
                          <div className="relative w-6 h-6 shrink-0">
                            <Image
                              src={`/icons/classes/${classIconMap[player.class]}.jpg`}
                              alt={player.class}
                              fill
                              className="object-contain"
                            />
                          </div>
                          <span className="text-red-300 text-sm whitespace-nowrap">
                            {player.username}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center p-4 text-gray-400">
                  🚀 게임 이력을 불러오는 중...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* ✅ 여기부터 추가: 듀오 밸런스 */}
      <DuoBalance />
    </div>
  );
}

function SearchBlock({ games }) {
  const [userList, setUserList] = useState([]);
  const [seasonList, setSeasonList] = useState([]);
  const [searchUser, setSearchUser] = useState("");
  const [searchSeason, setSearchSeason] = useState("ALL");
  const [searchClass, setSearchClass] = useState("");
  const [filteredGames, setFilteredGames] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [duoStats, setDuoStats] = useState([]);
  const [partnerList, setPartnerList] = useState([]);
  const [searchPartner, setSearchPartner] = useState("");
  const [duoLoading, setDuoLoading] = useState(false);

  const pageSize = 10;

  useEffect(() => {
    fetchUserList().then(data => setUserList(data.users || []));
    fetchSeasonList().then(data => setSeasonList(["ALL", ...data.map(s => s.TITLE)]));
  }, []);

  useEffect(() => {
    if (!searchUser) {
      setDuoStats([]);
      setPartnerList([]);
      return;
    }
  
    setDuoLoading(true); // 🔥 로딩 시작
  
    fetchUserDuoStats().then(data => {
      const filtered = data.filter(row =>
        searchSeason === "ALL" || row.SEASON === searchSeason
      );
  
      let processed = [];
  
      if (searchSeason === "ALL") {
        const merged = {};
  
        filtered.forEach(row => {
          const [a, b] = [row.PLAYER1, row.PLAYER2].sort();
          const key = `${a}||${b}`;
  
          if (!merged[key]) {
            merged[key] = { partner: `${a} & ${b}`, wins: 0, a, b };
          }
  
          merged[key].wins += row.WINS;
        });
  
        const ranked = Object.values(merged).sort((a, b) => b.wins - a.wins);
  
        let lastWins = null;
        let rank = 0;
  
        ranked.forEach((entry, index) => {
          if (entry.wins !== lastWins) {
            rank = index + 1;
            lastWins = entry.wins;
          }
          entry.duoRank = rank;
        });
  
        processed = ranked.filter(entry => entry.a === searchUser || entry.b === searchUser);
      } else {
        processed = filtered
          .filter(row => row.PLAYER1 === searchUser || row.PLAYER2 === searchUser)
          .map(row => ({
            partner: row.PLAYER1 === searchUser ? row.PLAYER2 : row.PLAYER1,
            wins: row.WINS,
            duoRank: row.DUO_RANK
          }));
      }
  
      setDuoStats(processed);
      setPartnerList(Array.from(new Set(processed.map(p => p.partner))));
      setDuoLoading(false); // 🔥 로딩 종료
    });
  }, [searchUser, searchSeason]);
  

  const handleSearch = () => {
    console.log("🎯 검색 시작", games);

    const results = [];

    games.forEach(game => {
      const season = (game.season || "시즌없음").toString().trim();
      const seasonFilter = (searchSeason || "").toString().trim();
    
      const userMatch = !searchUser || game.username === searchUser;
      const seasonMatch = seasonFilter === "ALL" || season === seasonFilter;
      const classMatch = !searchClass || game.class === searchClass;
    
      // ✅ 우리팀 찾기 (같은 게임번호 + 같은 결과 + 나 제외)
      const teammatePlayers = games
        .filter(g => g.gameId === game.gameId && g.result === game.result && g.username !== game.username)
        .map(g => g.username);
    
      // ✅ 상대팀 찾기 (같은 게임번호 + 반대 결과)
      const opponentPlayers = games
        .filter(g => g.gameId === game.gameId && g.result !== game.result)
        .map(g => g.username);
    
      // ✅ 파트너 필터 추가 (선택했을 경우 우리팀에 포함된 경우만 통과)
      const partnerMatch = !searchPartner || teammatePlayers.includes(searchPartner);
    
      if (userMatch && seasonMatch && classMatch && partnerMatch) {
        results.push({
          date: game.date,
          season: season,
          teammate: teammatePlayers.length > 0 ? teammatePlayers.join(", ") : "-",
          opponent: opponentPlayers.length > 0 ? opponentPlayers.join(", ") : "-",
          class: game.class
        });
      }
    });

    setFilteredGames(results);
    setCurrentPage(1);

    // ✅ 듀오 데이터도 같이 불러오기
    
    
  };

  const totalPages = Math.ceil(filteredGames.length / pageSize);
  const paginated = filteredGames.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-gray-800 p-6 rounded-lg text-white mt-10 w-[900px] mx-auto">
      <div className="flex gap-4 mb-4">
        <select value={searchUser} onChange={e => setSearchUser(e.target.value)} className="bg-gray-700 p-2 rounded">
          <option value="">유저 선택</option>
          {userList.map(user => <option key={user} value={user}>{user}</option>)}
        </select>

        <select value={searchSeason} onChange={e => setSearchSeason(e.target.value)} className="bg-gray-700 p-2 rounded">
          {seasonList.map(season => <option key={season} value={season}>{season}</option>)}
        </select>

        <select value={searchClass} onChange={e => setSearchClass(e.target.value)} className="bg-gray-700 p-2 rounded">
          <option value="">클래스 선택</option>
          {["드", "어", "넥", "슴"].map(cls => <option key={cls} value={cls}>{cls}</option>)}
        </select>

        <select value={searchPartner} onChange={e => setSearchPartner(e.target.value)} className="bg-gray-700 p-2 rounded">
          <option value="">파트너 선택</option>
          {partnerList.map(partner => <option key={partner} value={partner}>{partner}</option>)}
        </select>

        <button onClick={handleSearch} className="bg-green-600 px-4 rounded">검색</button>
      </div>

      <table className="w-full border-collapse border border-gray-700 text-center text-sm">
        <thead>
          <tr>
            <th>날짜</th>
            <th>시즌</th>
            <th>우리팀</th>
            <th>상대</th>
            <th>클래스</th>
          </tr>
        </thead>
        <tbody>
          {paginated.map((row, index) => (
            <tr key={index}>
              <td>{formatDate(row.date)}</td>
              <td>{row.season}</td>
              <td>{row.teammate}</td>
              <td>{row.opponent}</td>
              <td>{row.class}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-center items-center gap-4 mt-4">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} className="bg-gray-700 px-3 py-1 rounded">이전</button>
        <span>{currentPage} / {totalPages}</span>
        <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(currentPage + 1)} className="bg-gray-700 px-3 py-1 rounded">다음</button>
      </div>

      {/* 듀오 통계 */}
      <div className="mt-10">
        <h3 className="text-xl text-white font-semibold mb-2">DUO 통계</h3>

        {duoLoading ? (
          <div className="text-gray-400 text-sm p-4">⏳ 듀오 통계를 불러오는 중입니다...</div>
        ) : duoStats.length === 0 ? (
          <div className="text-gray-400 text-sm p-4">⚡ 듀오 기록이 없습니다.</div>
        ) : (
          <table className="w-full border-collapse border border-gray-700 text-center text-sm">
            <thead>
              <tr>
                <th>파트너</th>
                <th>승리수</th>
                <th>듀오랭크</th>
              </tr>
            </thead>
            <tbody>
              {(!searchPartner
                ? duoStats
                : duoStats.filter(duo => duo.partner === searchPartner)
              ).map((duo, index) => (
                <tr key={index}>
                  <td>{duo.partner}</td>
                  <td>{duo.wins}승</td>
                  <td>{duo.duoRank}위</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function formatDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")} ${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
}

