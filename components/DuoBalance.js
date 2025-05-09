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

  const pageSize = 8;

  useEffect(() => {
    fetchDuoStats();
  }, []);

  const fetchDuoStats = async () => {
    const res = await fetch("/api/gasApi?action=getUserDuoStats");
    const data = await res.json();
    setDuoData(data);
  
    const users = Array.from(
      new Set(data.flatMap((row) => [row.PLAYER1, row.PLAYER2]))
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
      .filter((row) => row.PLAYER1 === user || row.PLAYER2 === user)
      .map((row) => (row.PLAYER1 === user ? row.PLAYER2 : row.PLAYER1));

    const uniquePartners = Array.from(new Set(partners));

    // All 추가해서 availableUsers 갱신
    setAvailableUsers(["All", ...uniquePartners]);
  };

  const filteredData = duoData
    .filter((row) => {
      if (!selectedUserA || !selectedUserB) return false;

      const seasonMatch =
        selectedSeason === "ALL"
            ? selectedUserB === "All"
            ? row.SEASON === "ALL"        // ✅ 유저B도 All → 누적만!
            : row.SEASON !== "ALL"        // ✅ 유저B는 특정 → 시즌별
            : row.SEASON === selectedSeason;



      if (selectedUserB === "All") {
        // All 선택 → 첫 유저가 포함된 모든 듀오 기록
        return (row.PLAYER1 === selectedUserA || row.PLAYER2 === selectedUserA) && seasonMatch;
      } else {
        // 특정 유저 선택 → A와 B 둘 다 매치
        const pairMatch =
          (row.PLAYER1 === selectedUserA && row.PLAYER2 === selectedUserB) ||
          (row.PLAYER1 === selectedUserB && row.PLAYER2 === selectedUserA);

        return pairMatch && seasonMatch;
      }
    })
    .filter((row) => row.WINS > 0) // ✅ 승수 0이면 제외
    .sort((a, b) => a.DUO_RANK - b.DUO_RANK);

  const paginated = filteredData.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredData.length / pageSize);

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
                  paginated.map((row, index) => {
                    const partner =
                      row.PLAYER1 === selectedUserA
                        ? row.PLAYER2
                        : row.PLAYER1;

                    return (
                        
                        <tr key={`${partner}-${row.SEASON}`} className="border-t border-gray-600 cursor-default">

                        {index === 0 && (
                                <td
                                rowSpan={paginated.length}
                                className="p-2 font-bold text-yellow-400 text-center align-middle border-r border-gray-700"
                                >
                                {selectedUserA}
                                </td>
                            )}
                        <td className="p-2">
                          <TooltipWrapper
                            content={
                                <div className="flex flex-col gap-1 text-sm max-h-[250px] overflow-y-auto overflow-x-hidden px-2 py-1 break-words">

                                    {/* ✅ 고정 제목 줄 */}
                                    <div className="flex justify-between font-bold text-yellow-400 mb-1 pl-10">
                                        <span>Duo</span>
                                        <span>승수</span>
                                    </div>

                                    {/* 구분선 */}
                                    <hr className="border-gray-600 mb-1" />
                                  
                                  {(() => {
                                    const comboCounts = {};
                                    row.WIN_CLASS_LIST?.split(", ").forEach((combo) => {
                                      comboCounts[combo] = (comboCounts[combo] || 0) + 1;
                                    });
                                    return Object.entries(comboCounts)
                                        .sort((a, b) => b[1] - a[1]) // ✅ count 기준 내림차순 정렬
                                        .map(([combo, count], i) => {

                                      const [classA, classB] = combo.split("/");
                                      return (
                                        <div key={`${combo}-${i}`} className="flex items-center gap-1">
                                          <Image src={`/icons/classes/${classIconMap[classA]}.jpg`} alt={classA || "classA"} width={16} height={16} />
                                          <span className="mr-1">{selectedUserA}</span>
                                          <span>&</span>
                                          <Image src={`/icons/classes/${classIconMap[classB]}.jpg`} alt={classB || "classB"} width={16} height={16} />
                                          <span>{selectedUserB === "All" ? partner : selectedUserB}</span>
                                          <span className="ml-1 text-gray-400"> {count}</span>
                                        </div>
                                      );
                                    });
                                  })()}

                                    {/* 구분선 */}
                                    <hr className="border-gray-600 mb-1" />

                                    {/* ✅ All / 총 승수 요약 */}
                                    <div className="flex justify-between text-gray-300 text-xs">
                                    <span className="ml-1 text-yellow-400 font-semibold pl-10">All</span>
                                    <span className="ml-1 text-yellow-400 font-semibold">{row.WINS}승</span>

                                    </div>
                                </div>

                                
                              }
                          >
                            <span>{partner}</span>
                          </TooltipWrapper>
                        </td>
                        <td className="p-2">{`${row.DUO_RANK}위`}</td>
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
