"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import TooltipWrapper from "@/components/TooltipWrapper";
import { RotateCcw } from "lucide-react";

const classIconMap = {
    "드": "druid",
    "어": "oracle",
    "넥": "necro",
    "슴": "summoner"
  };
  

export default function DuoBalance() {
  const [duoData, setDuoData] = useState([]);
  const [userList, setUserList] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUserA, setSelectedUserA] = useState("");
  const [selectedUserB, setSelectedUserB] = useState("");
  const [seasonList, setSeasonList] = useState(["ALL"]);
  const [selectedSeason, setSelectedSeason] = useState("ALL");
  const [page, setPage] = useState(1);
  const [rankingSeason, setRankingSeason] = useState("ALL");
  const [rankingPage, setRankingPage] = useState(1);
  const rankingPageSize = 12;

  const pageSize = 8;

  const getPaginatedDuoRankings = () => {
    const filtered = duoData
      .filter(row =>
        row.SEASON === rankingSeason &&
        row.WINRATE_RANK &&
        row.WINS > 0
      )
      .sort((a, b) => a.WINRATE_RANK - b.WINRATE_RANK); // ✅ DUO_RANK 기준 정렬

    const start = (rankingPage - 1) * rankingPageSize;
    return filtered.slice(start, start + rankingPageSize);
  };

  const totalRankingPages = Math.ceil(
    duoData.filter(row =>
      row.SEASON === rankingSeason &&
      row.WINRATE_RANK &&
      row.WINS > 0
    ).length / rankingPageSize
  );


  useEffect(() => {
    fetchDuoStats();
  }, []);

  const fetchDuoStats = async () => {
    const res = await fetch("/api/gasApi?action=getUserDuoStats");
    const data = await res.json();
    setDuoData(data);
  
    const users = Array.from(
        new Set(
          data
            .filter((row) => row.WINRATE_RANK !== "" && row.TOTAL >= 5 && row.WINS >= 1)
            .flatMap((row) => [row.PLAYER1, row.PLAYER2])
        )
      );
      setUserList(users);
      setAvailableUsers(users);      
  
    // ✅ 중복 제거 순서: 먼저 filter → 나중에 Set
    const rawSeasons = data.map((r) => r.SEASON).filter((s) => s !== "ALL");
    const uniqueSeasons = Array.from(new Set(rawSeasons));
  
    setSeasonList(["ALL", ...uniqueSeasons]);
  };
  

  const handleReset = () => {
    setSelectedUserA("");
    setSelectedUserB("");
    setSelectedSeason("ALL");
    setAvailableUsers(userList);
    setPage(1);
  };

  const selectUserA = (user) => {
    setSelectedUserA(user);
    setSelectedUserB("");
  
    const partners = duoData
      .filter(
        (row) =>
          (row.PLAYER1 === user || row.PLAYER2 === user) &&
          row.WINRATE_RANK !== "" &&
          row.TOTAL >= 5 &&
          row.WINS >= 1
      )
      .map((row) => (row.PLAYER1 === user ? row.PLAYER2 : row.PLAYER1));
  
    const uniquePartners = Array.from(new Set(partners));
  
    setAvailableUsers(["All", ...uniquePartners]);
  };  

  const filteredData = duoData
  .filter((row) => {
    if (!selectedUserA || !selectedUserB) return false;

    const seasonMatch =
      selectedSeason === "ALL"
        ? selectedUserB === "All"
          ? row.SEASON === "ALL"
          : row.SEASON !== "ALL"
        : row.SEASON === selectedSeason;

    if (selectedUserB === "All") {
      return (
        (row.PLAYER1 === selectedUserA || row.PLAYER2 === selectedUserA) &&
        seasonMatch
      );
    } else {
      const pairMatch =
        (row.PLAYER1 === selectedUserA && row.PLAYER2 === selectedUserB) ||
        (row.PLAYER1 === selectedUserB && row.PLAYER2 === selectedUserA);
      return pairMatch && seasonMatch;
    }
  })
  .filter((row) => row.WINS > 0)
  .sort((a, b) => {
    const rankA = a.WINRATE_RANK === "" ? Infinity : a.WINRATE_RANK;
    const rankB = b.WINRATE_RANK === "" ? Infinity : b.WINRATE_RANK;
    return rankA - rankB;
  });

  const filtered = filteredData.filter(
    (row) =>
      row.WINRATE_RANK !== "" &&
      row.TOTAL >= 5 &&
      row.WINS >= 1
  );
    
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div className="relative w-[900px] h-[1000px] mx-auto mt-20 text-white">
      {/* 배경 */}
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <Image
          src="/icons/bg/duo_balance_bg.png"
          alt="DUO BALANCE BG"
          fill
          className="object-contain"
        />
      </div>

      {/* 내용 */}
      <div className="absolute inset-0 z-10 p-10 flex flex-col gap-8 items-center">
        
        {/* 전체 초기화 버튼 (오른쪽 상단에 작게) */}
        <div className="w-full flex justify-end mb-4 mt-15 pr-25">
        <button
            onClick={handleReset}
            className="text-white hover:text-red-400 transition"
            title="전체 초기화"
            >
            <RotateCcw size={30} />
            </button>
        </div>

        {/* 선택된 유저 영역 */}
        <div className="flex justify-center items-center gap-38 text-3xl font-bold -mt-20 mb-6 pl-13">
        <div className="min-w-[120px] text-center border-b-2 border-gray-500">
            {selectedUserA || "?"}
        </div>
        <div className="min-w-[120px] text-center border-b-2 border-gray-500">
            {selectedUserB || "?"}
        </div>
        </div>

        {/* 유저 선택 */}
        <div className="flex flex-wrap justify-center gap-3 max-w-[800px]">
          {!selectedUserA
            ? userList.map((user) => (
                <button
                  key={user}
                  onClick={() => selectUserA(user)}
                  className="px-4 py-2 rounded text-sm bg-gray-700 hover:bg-gray-600"
                >
                  {user}
                </button>
              ))
            : availableUsers.map((user) => (
                <button
                  key={user}
                  onClick={() => setSelectedUserB(user)}
                  className={`px-4 py-2 rounded text-sm ${
                    selectedUserB === user ? "bg-green-600" : "bg-gray-700"
                  }`}
                >
                  {user}
                </button>
              ))}
        </div>

        {/* 시즌 선택 */}
        {selectedUserA && selectedUserB && (
          <div className="w-full flex justify-end pr-4 mt-6">
            <select
              value={selectedSeason}
              onChange={(e) => setSelectedSeason(e.target.value)}
              className="bg-gray-700 p-2 rounded"
            >
              {seasonList.map((season) => (
                <option key={season} value={season}>
                  {season}
                </option>
              ))}
            </select>
          </div>
        )}

        {!selectedUserA && !selectedUserB && (
  <>
    {/* 시즌 드롭다운 */}
    <div className="w-full flex justify-end pr-4 mt-6">
      <select
        value={rankingSeason}
        onChange={(e) => {
          setRankingSeason(e.target.value);
          setRankingPage(1); // 시즌 바꾸면 1페이지로 초기화
        }}
        className="bg-gray-700 p-2 rounded"
      >
        {seasonList.map((season) => (
          <option key={season} value={season}>
            {season}
          </option>
        ))}
      </select>
    </div>

    {/* 타이틀 */}
    <h3 className="text-2xl font-bold text-white mb-4 mt-4">
      🔥 DUO POWER RANKING (Top 100) - <span className="text-yellow-400">{rankingSeason}</span>
    </h3>

    {/* 카드형 랭킹 리스트 */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {getPaginatedDuoRankings().map((row, index) => {
  const globalRank = (rankingPage - 1) * rankingPageSize + index + 1;
  const duoPlayers = [row.PLAYER1, row.PLAYER2].sort((a, b) => a.localeCompare(b, "ko"));
  const [playerA, playerB] = duoPlayers;

  return (
    <TooltipWrapper
      key={`${row.PLAYER1}-${row.PLAYER2}-${index}`}
      content={
        <div className="flex flex-col max-h-[300px] overflow-y-auto overflow-x-hidden px-3 py-2 space-y-2 text-white text-base">
          {/* ✅ 제목 */}
          <div className="flex justify-between font-bold mb-1 text-lg pl-10">
            <span>Duo</span>
            <span>승수</span>
          </div>
          <hr className="border-gray-600 mb-1" />

          {/* ✅ 클래스 조합 리스트 */}
          <div className="space-y-1">
            {(() => {
              const comboCounts = {};
              row.WIN_CLASS_LIST?.split(", ").forEach((combo) => {
                comboCounts[combo] = (comboCounts[combo] || 0) + 1;
              });

              return Object.entries(comboCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([combo, count], i) => {
                  const [classA = "", classB = ""] = combo?.split("/") || [];
                  return (
                    <div key={`${combo}-${i}`} className="flex items-center gap-2">
                      <Image src={`/icons/classes/${classIconMap[classA]}.jpg`} alt={classA} width={18} height={18} />
                      <span>{playerA}</span>
                      <span>&</span>
                      <Image src={`/icons/classes/${classIconMap[classB]}.jpg`} alt={classB} width={18} height={18} />
                      <span>{playerB}</span>
                      <span className="ml-2 text-yellow-400 font-semibold">{count}</span>
                    </div>
                  );
                });
            })()}
          </div>

          {/* ✅ 총합 요약 */}
          <div className="border-t border-gray-600 pt-1 flex justify-between font-semibold text-base">
            <span className="ml-1 font-semibold pl-10">All</span>
            <span className="ml-1 text-yellow-400 font-semibold pl-10">{row.WINS}승</span>
          </div>
        </div>
      }
    >
      <div className="relative bg-gray-800 rounded-lg p-4 flex flex-col items-center shadow-md">
        <p className="text-yellow-300 font-bold text-lg mb-2 flex items-center gap-1">
          {globalRank <= 3 ? (
            <span className="text-1xl">
              {globalRank === 1 ? "🥇" : globalRank === 2 ? "🥈" : "🥉"}
            </span>
          ) : (
            <span>{globalRank}위</span>
          )}
        </p>

        <div className="flex items-center gap-2">
          {duoPlayers.map((player, idx) => (
            <div key={idx} className="flex items-center gap-1">
              <div className="relative w-6 h-6 rounded-full overflow-hidden border border-gray-500">
                <Image
                  src={`/icons/users/웹_${player}.jpg`}
                  alt={player}
                  fill
                  className="object-cover"
                  onError={(e) => (e.currentTarget.src = "/icons/users/default.png")}
                />
              </div>
              <span>{player}</span>
              {idx === 0 && <span className="mx-1 text-gray-400">&</span>}
            </div>
          ))}
        </div>
      </div>
    </TooltipWrapper>
  );
})}



    </div>

    {/* 페이지네이션 */}
    <div className="flex justify-center items-center gap-4 mt-6">
      <button
        disabled={rankingPage === 1}
        onClick={() => setRankingPage(rankingPage - 1)}
        className="px-4 py-1 bg-gray-700 rounded disabled:opacity-50"
      >
        &lt; PRE
      </button>
      <span className="text-white">{rankingPage} / {totalRankingPages}</span>
      <button
        disabled={rankingPage === totalRankingPages}
        onClick={() => setRankingPage(rankingPage + 1)}
        className="px-4 py-1 bg-gray-700 rounded disabled:opacity-50"
      >
        NEXT &gt;
      </button>
    </div>
  </>
)}



        {/* 결과 테이블 */}
        {selectedUserA && selectedUserB && (
          <>
            {/* 듀오 결과 제목 */}
            <h3 className="text-2xl font-bold text-white mb-4 -mt-15">
            <span className="text-yellow-400">{selectedUserA} & {selectedUserB}</span> 의 듀오 결과
            </h3>

            <table className="w-full text-center border border-gray-600 text-lg bg-black bg-opacity-60 -mt-5">
              <thead>
                <tr className="bg-gray-800">
                <th className="p-2">User</th>
                  <th className="p-2">With</th>
                  <th className="p-2">Duo Power</th>
                  <th className="p-2">Season</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length > 0 ? (
                  paginated.filter(
                    (row) =>
                      row.WINRATE_RANK !== "" &&
                      row.TOTAL >= 5 &&
                      row.WINS >= 1
                  )
                  .map((row, index) => {
                    const partner =
                      row.PLAYER1 === selectedUserA
                        ? row.PLAYER2
                        : row.PLAYER1;

                    return (
                        
                        <tr key={`${partner}-${row.SEASON}`} className="border-t border-gray-600 cursor-default">

                        {index === 0 && (
                                <td
                                rowSpan={
                                    paginated.filter(
                                      (r) =>
                                        r.WINRATE_RANK !== "" &&
                                        r.TOTAL >= 5 &&
                                        r.WINS >= 1
                                    ).length
                                  }
                                className="p-2 font-bold text-yellow-400 text-center align-middle border-r border-gray-700"
                                >
                                {selectedUserA}
                                </td>
                            )}
                        <td className="p-2">
                        <TooltipWrapper
                            content={
                                <div className="flex flex-col max-h-[300px] overflow-y-auto overflow-x-hidden px-3 py-2 space-y-2 text-white text-base">
                                
                                {/* ✅ 제목 */}
                                <div className="flex justify-between font-bold mb-1 text-lg pl-10">
                                                                    <span>Duo</span>
                                                                    <span>승수</span>
                                                                </div>
                                    <hr className="border-gray-600 mb-1" />

                                {/* ✅ 클래스 조합 리스트 */}
                                <div className="space-y-1">
                                    {(() => {
                                    const comboCounts = {};
                                    row.WIN_CLASS_LIST?.split(", ").forEach((combo) => {
                                        comboCounts[combo] = (comboCounts[combo] || 0) + 1;
                                    });

                                    return Object.entries(comboCounts)
                                        .sort((a, b) => b[1] - a[1])
                                        .map(([combo, count], i) => {
                                        const [classA, classB] = combo.split("/");
                                        return (
                                            <div key={`${combo}-${i}`} className="flex items-center gap-2">
                                            <Image
                                                src={`/icons/classes/${classIconMap[classA]}.jpg`}
                                                alt={classA || "classA"}
                                                width={18}
                                                height={18}
                                            />
                                            <span>{selectedUserA}</span>
                                            <span>&</span>
                                            <Image
                                                src={`/icons/classes/${classIconMap[classB]}.jpg`}
                                                alt={classB || "classB"}
                                                width={18}
                                                height={18}
                                            />
                                            <span>{selectedUserB === "All" ? partner : selectedUserB}</span>
                                            <span className="ml-2 text-yellow-400 font-semibold"> {count}</span>
                                            </div>
                                        );
                                        });
                                    })()}
                                </div>

                                {/* ✅ 총합 요약 */}
                                <div className="border-t border-gray-600 pt-1 flex justify-between font-semibold text-base">
                                    <span className="ml-1 font-semibold pl-10">All</span>
                                    <span className="ml-1 text-yellow-400 font-semibold pl-10">{row.WINS}승</span>
                                </div>
                                </div>
                            }
                            >
                            <span className="text-base">{partner}</span>
                            </TooltipWrapper>
                        </td>
                        <td className="p-2">{`${row.WINRATE_RANK}위`}</td>
                        <td className="p-2">{row.SEASON}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="3" className="p-4 text-gray-400">
                      🚀 데이터가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* 페이지네이션 */}
            <div className="flex justify-center items-center gap-4 mt-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-4 py-1 bg-gray-700 rounded disabled:opacity-50"
              >
                &lt; pre
              </button>
              <span>{page} / {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="px-4 py-1 bg-gray-700 rounded disabled:opacity-50"
              >
                next &gt;
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
