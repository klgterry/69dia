"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

// GAS API에서 유저 데이터 가져오기 (시즌별 데이터 포함)
async function fetchUserData(season = "전체") {
  const response = await fetch(`/api/gasApi?action=getUsers&season=${season}`);
  if (!response.ok) {
    throw new Error("Failed to fetch user data");
  }
  const data = await response.json();
  console.log(`👤 가져온 유저 데이터 (${season}):`, data); // ✅ 데이터 확인
  return data;
}

export default function UserPage() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [season, setSeason] = useState("전체"); // ✅ 시즌 선택 상태 추가

  useEffect(() => {
    fetchUserData(season)
      .then((data) => {
        if (data.players) {
          setUsers(data.players.map(user => ({
            username: user.username,
            totalWins: user.druidWins + user.oracleWins + user.necroWins + user.summonerWins, // ✅ 총 승수 계산
            druidWins: user.druidWins || 0,
            oracleWins: user.oracleWins || 0,
            necroWins: user.necroWins || 0,
            summonerWins: user.summonerWins || 0
          })));
          setFilteredUsers(data.players);
        }
      })
      .catch((error) => console.error("Error fetching user data:", error));
  }, [season]); // ✅ 시즌 변경 시 데이터 다시 로드

  // 검색 기능
  useEffect(() => {
    if (search.trim() === "") {
      setFilteredUsers(users);
    } else {
      setFilteredUsers(
        users.filter(user => 
          user.username.toLowerCase().includes(search.toLowerCase())
        )
      );
    }
  }, [search, users]);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* 네비게이션 바 */}
      <nav className="flex space-x-4 text-lg justify-start mb-4 ml-2">
        <Link href="/" className="hover:underline">[Main]</Link>
        <Link href="/history" className="hover:underline">[History]</Link>
        <Link href="/user" className="hover:underline">[User]</Link>
      </nav>

      {/* 타이틀 영역 */}
      <div className="text-center mt-6">
        <h1 className="text-3xl font-bold">👤 유저 검색</h1>
        <p className="mt-2 text-gray-400">유저명을 입력하여 정보를 검색하세요.</p>
      </div>

      {/* 시즌 선택 & 검색창 */}
      <div className="max-w-5xl mx-auto flex justify-between mt-4">
        {/* 시즌 선택 드롭다운 */}
        <select 
          className="bg-gray-800 text-white p-2 rounded"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
        >
          <option>전체</option>
          <option>25년 3월 시즌</option>
          <option>25년 2월 시즌</option>
          <option>25년 1월 시즌</option>
        </select>

        {/* 검색창 */}
        <input
          type="text"
          className="w-full max-w-lg bg-gray-800 text-white p-2 rounded"
          placeholder="유저명을 입력하세요..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* 유저 정보 테이블 */}
      <div className="mt-6 bg-gray-800 p-6 rounded-lg max-w-5xl mx-auto">
        <h2 className="text-center text-xl mb-4">📋 유저 목록 ({season})</h2>

        <table className="w-full border-collapse border border-gray-700 text-center">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="p-1">아이디</th>
              <th className="p-1">총 승수</th>
              <th className="p-1">클래스별 승수</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.username} className="border-b border-gray-700">
                  <td className="p-1 flex text-left items-center pl-55 space-x-2">
                    <Image 
                      src={`/icons/users/웹_${user.username}.jpg`} 
                      onError={(e) => e.target.src = "/icons/users/default.png"} 
                      alt="User Icon" 
                      className="w-8 h-8 object-cover rounded-none"
                    />
                    <span className="whitespace-nowrap">{user.username}</span>
                  </td>
                  <td className="p-1">{user.totalWins}</td>
                  <td className="p-1 flex justify-center space-x-4 items-center">
                    <div className="flex items-center space-x-1">
                      <Image src="/icons/classes/druid.jpg" alt="Druid" className="w-8 h-8 object-cover rounded-none"  /> 
                      <span className="text-sm">{user.druidWins}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Image src="/icons/classes/oracle.jpg" alt="Oracle" className="w-8 h-8 object-cover rounded-none"  /> 
                      <span className="text-sm">{user.oracleWins}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Image src="/icons/classes/necro.jpg" alt="Necro" className="w-8 h-8 object-cover rounded-none"  /> 
                      <span className="text-sm">{user.necroWins}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Image src="/icons/classes/summoner.jpg" alt="Summoner" className="w-8 h-8 object-cover rounded-none"  /> 
                      <span className="text-sm">{user.summonerWins}</span>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="text-center p-4">❌ 유저를 찾을 수 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
