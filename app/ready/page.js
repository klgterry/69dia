"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Slot from "@/components/Slot";


async function fetchLeaderboard() {
  const response = await fetch("/api/gasApi?action=getLeaderboard");
  if (!response.ok) {
    throw new Error("Failed to fetch leaderboard");
  }
  const data = await response.json();
  return data.players || [];
}


// 👇 이걸 TeamPage 컴포넌트 위에 선언
async function fetchPlayerInfo(players) {
  const response = await fetch("/api/gasApi?", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "getPlayersInfo",
      players,
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.players;
}



function parsePlayersInput(inputString) {
  const parsed = {};

  // ✅ 전체 문자열에서 유저명(옵션) 구조를 정규식으로 추출
  const regex = /([^\s,\/()]+)(?:\(([^)]+)\))?/g;
  let match;

  while ((match = regex.exec(inputString)) !== null) {
    const username = match[1].trim();
    const classRaw = match[2];

    if (classRaw) {
      const classes = classRaw.split(",").map(c => c.trim());

      if (classes.length > 3) {
        alert(`🚨 ${username}의 클래스는 최대 3개까지만 입력 가능합니다!\n현재 입력된 클래스: ${classes.join(", ")}`);
        continue;
      }

      parsed[username] = classes;
    } else {
      parsed[username] = null;
    }
  }

  return parsed;
}


function calculateEffectiveMMR(players, parsedPlayers) {
  return players.map((p) => {
    const preferred = parsedPlayers[p.username];
    let effectiveMMR = p.mmr;

    if (preferred && preferred.length > 0) {
      const mmrs = preferred.map((cls) => {
        switch (cls) {
          case "드": return p.mmrD;
          case "어": return p.mmrA;
          case "넥": return p.mmrN;
          case "슴": return p.mmrS;
          default: return null;
        }
      }).filter(m => m !== null);

      if (mmrs.length > 0) {
        effectiveMMR = mmrs.reduce((a, b) => a + b, 0) / mmrs.length;
      }
    }

    return { ...p, effectiveMMR };
  });
}

function assignPlayerRoles(team, parsedPlayers) {
  const positions = ["드", "어", "넥", "슴"];
  const assigned = [];
  const used = new Set();

  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  console.log("🔄 [클래스 랜덤] 1회차:", positions); // 예: ["넥", "드", "슴", "어"]

  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  console.log("🔄 [클래스 랜덤] 2회차:", positions); // 예: ["넥", "드", "슴", "어"]

  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }

  console.log("🔄 [클래스 랜덤] 3회차:", positions); // 예: ["넥", "드", "슴", "어"]

  console.log("🔄 [클래스 배정 시작] 팀:", team.map(p => p.username));
  console.log("📌 [사용자 지정 클래스]:", parsedPlayers);

  // 1. 사용자 지정 클래스 중에서 단일 지정 우선 배정
  for (const pos of positions) {
    for (const player of team) {
      const username = player.username;
      if (used.has(username)) continue;

      const preferred = parsedPlayers[username];

      // 🎯 지정 클래스가 딱 하나일 때만 우선 배정
      if (preferred && preferred.length === 1 && preferred[0] === pos) {
        assigned.push({ username, class: pos });
        used.add(username);
        console.log(`🔒 [단일 지정 클래스 고정] ${username} → ${pos}`);
        break;
      }
    }
  }

  // 1. 사용자 지정 클래스 우선 배정
  for (const pos of positions) {
    for (const player of team) {
      const username = player.username;
      if (used.has(username)) continue;

      const preferred = parsedPlayers[username];
      if (preferred && preferred.includes(pos)) {
        assigned.push({ username, class: pos });
        used.add(username);
        console.log(`✅ [지정 클래스 배정] ${username} → ${pos}`);
        break;
      }
    }
  }

  // 2. 나머지는 가능한 포지션으로 자동 배정
  for (const pos of positions) {
    if (assigned.some(p => p.class === pos)) continue;

    const candidates = team.filter(p => {
      const username = p.username;
      if (used.has(username)) return false;
      const available = p.class.split(", ").map(c => c.trim());
      return available.includes(pos);
    });

    if (candidates.length > 0) {
      const randomPick = candidates[Math.floor(Math.random() * candidates.length)];
      assigned.push({ username: randomPick.username, class: pos });
      used.add(randomPick.username);
      console.log(`🌀 [자동 클래스 배정] ${randomPick.username} → ${pos}`);
    } else {
      console.warn(`⚠️ [포지션 미배정] ${pos}에 배정 가능한 유저 없음`);
      return null; // ⚠️ 배정 실패
    }
  }

  // 3. 드 → 어 → 넥 → 슴 순 정렬
  const positionOrder = { "드": 0, "어": 1, "넥": 2, "슴": 3 };
  assigned.sort((a, b) => positionOrder[a.class] - positionOrder[b.class]);

  console.log("✅ [최종 클래스 배정 결과]", assigned);
  return assigned;
}

function copyTeamResult(teamA, teamB) {
  const result = `[아래]${teamA.map(p => p.username).join("/")} vs [위]${teamB.map(p => p.username).join("/")}`;

  navigator.clipboard.writeText(result)
    .then(() => {
      alert(`✅ 생성결과가 클립보드에 복사되었습니다!\n\n${result}`);
      console.log("📋 복사된 내용:", result);
    })
    .catch((err) => {
      console.error("🚨 복사 실패:", err);
      alert("🚨 복사에 실패했습니다!");
    });
}

function EditableTeam({ team, allPlayers, onUpdate }) {
  const handleChange = (index, newUsername) => {
    const updated = [...team];
    updated[index] = newUsername;
    onUpdate(updated);
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      {team.map((username, idx) => (
        <div key={idx} className="relative">
          <select
            value={username}
            onChange={(e) => handleChange(idx, e.target.value)}
            className="bg-gray-700 text-white p-2 rounded-lg w-32"
          >
            {allPlayers.map((user) => (
              <option key={user} value={user}>{user}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

const playSound = (fileName = "mix.mp3") => {
  if (typeof window !== "undefined") {
    const audio = new Audio(`/sfx/${fileName}`);
    audio.play().catch(err => console.error("🎵 효과음 재생 실패:", err));
  }
};

function checkClassDistribution(players) {
  const counts = { 드: 0, 어: 0, 넥: 0, 슴: 0 };

  players.forEach(player => {
    const classList = player.class?.split(/,\s*/).map(c => c.trim()) || [];
    for (const cls of Object.keys(counts)) {
      if (classList.includes(cls)) counts[cls]++;
    }
  });

  const missing = Object.entries(counts)
    .filter(([cls, count]) => count < 2)
    .map(([cls]) => cls);

  if (missing.length > 0) {
    alert(`🚨 클래스 분포가 부족합니다!\n❌ 부족한 클래스: ${missing.join(", ")}`);
    return false;
  }

  return true;
}

function getPlayerCount(players) {
  // 1. 괄호 안 내용 제거: 참치(어,드) → 참치
  const cleaned = players.replace(/\([^)]*\)/g, '');

  // 2. 쉼표로 분리해서 유저만 카운트
  const names = cleaned.split(',')
    .map(name => name.trim())
    .filter(name => name.length > 0);

  return names.length;
}


export default function TeamPage() {
  const [players, setPlayers] = useState("");
  const [selectedClasses, setSelectedClasses] = useState({});
  const [showClassPanel, setShowClassPanel] = useState(false);
  const [isClassButtonPressed, setIsClassButtonPressed] = useState(false);
  const [confirmState, setConfirmState] = useState("default");
  const [teamA, setTeamA] = useState([]);
  const [teamB, setTeamB] = useState([]);
  const [teamAScore, setTeamAScore] = useState(0);
  const [teamBScore, setTeamBScore] = useState(0);
  const [initialTeamA, setInitialTeamA] = useState([]);
  const [initialTeamB, setInitialTeamB] = useState([]);
  const [teamsGenerated, setTeamsGenerated] = useState(false); // 팀 생성 완료 여부 상태
  const [isMixPressed, setIsMixPressed] = useState(false);
  const [isCopyResultPressed, setIsCopyResultPressed] = useState(false);
  const [isCopyMatchPressed, setIsCopyMatchPressed] = useState(false);
  const router = useRouter();
  const SLOT_DELAY_PER_INDEX = 200;  // 슬롯 하나당 딜레이
  const SLOT_DURATION = 1000;        // 하나의 슬롯 도는 시간
  const TOTAL_SLOT_TIME = SLOT_DELAY_PER_INDEX * 7 + SLOT_DURATION; // 8개 기준
  const [leaderboardTop10, setLeaderboardTop10] = useState([]);
  const playerCount = getPlayerCount(players);
  const isReady = playerCount === 8;


  useEffect(() => {
    fetchLeaderboard().then(players => {
      const top10 = players
        .filter(p => p.wins >= 1)
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 25);
      setLeaderboardTop10(top10);
    }).catch(err => console.error("랭킹 데이터 불러오기 실패:", err));
  }, []);

  async function fetchAndSetClassInfo(players) {
    const response = await fetch("/api/gasApi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "getPlayersInfo", players }),
    });
    const data = await response.json();

    const classMap = {};
    for (const p of data.players || []) {
      classMap[p.username] = p.class?.split(", ").map(c => c.trim()) || [];
    }
    setSelectedClasses(classMap);
  }



  const handleCopyMatchResult = () => {
    const aNames = teamA.map(p => p.username || p).join("/");
    const bNames = teamB.map(p => p.username || p).join("/");
    const result = `!결과등록 [아래${teamAScore}]${aNames} vs [위${teamBScore}]${bNames}`;


    navigator.clipboard.writeText(result)
      .then(() => alert(`✅ 생성결과가 클립보드에 복사되었습니다!\n\n${result}`))
      .catch(() => alert("❌ 복사 실패!"));

    console.log("📋 복사된 내용:", result);
  };

  const generateTeams = async () => {
    playSound("mix.mp3"); // 🔥 여기서 재생됨
    setTeamsGenerated(false);

    //const parsedPlayers = parsePlayersInput(players);
    //const playerList = Object.keys(parsedPlayers); // ✅ 키를 리스트로 변환

    const playerList = Object.keys(selectedClasses); // 🔁 1. 유저 목록 먼저 만들고

    const parsedPlayers = {};                        // 🔁 2. 그 다음 파싱 시작
    for (const p of playerList) {
      if (selectedClasses[p] && selectedClasses[p].length > 0) {
        parsedPlayers[p] = selectedClasses[p]; // ✅ 지정한 클래스 사용
      } else {
        parsedPlayers[p] = []; // ✅ 지정 안 한 유저는 빈 배열
      }
    }




    console.log("🧾 입력된 플레이어 목록(유저만):", playerList);
    console.log("🧾 입력된 플레이어 목록:", parsedPlayers);

    if (playerList.length !== 8) {
      alert("8명의 플레이어를 입력해주세요.");
      return;
    }

    try {
      console.log("📡 fetchPlayerInfo 호출 전");
      const playerData = await fetchPlayerInfo(playerList);
      console.log("📬 fetchPlayerInfo 응답:", playerData);

      if (!Array.isArray(playerData) || playerData.length !== 8) {
        console.warn("⚠️ 예상한 8명의 데이터를 받지 못했습니다:", playerData);
      }

      if (!checkClassDistribution(playerData)) {
        return; // 클래스 분포가 부족하면 더 진행하지 않음
      }

      const enrichedPlayerData = calculateEffectiveMMR(playerData, parsedPlayers);

      console.log("📊 MMR 정렬 전 데이터:", enrichedPlayerData.map(p => ({
        username: p.username,
        effectiveMMR: p.effectiveMMR,
      })));

      const sorted = enrichedPlayerData.sort((a, b) => b.effectiveMMR - a.effectiveMMR);

      console.log("📊 정렬 후 데이터:", enrichedPlayerData.map(p => ({
        username: p.username,
        effectiveMMR: p.effectiveMMR,
      })));

      // 3. 상위 4명 중 2명, 하위 4명 중 2명 선택
      const topHalf = sorted.slice(0, 4);
      const bottomHalf = sorted.slice(4, 8); // 총 8명 기준

      const getRandomSamples = (arr, n) => {
        const copy = [...arr];
        const result = [];
        for (let i = 0; i < n; i++) {
          const idx = Math.floor(Math.random() * copy.length);
          result.push(copy.splice(idx, 1)[0]);
        }
        return result;
      };

      let attempt = 0;
      const maxAttempts = 10;
      let success = false;

      while (attempt < maxAttempts && !success) {
        console.log(`🔁 [시도 ${attempt + 1}] 팀 배정 시작`);

        const team1Top = getRandomSamples(topHalf, 2);
        const team1Bottom = getRandomSamples(bottomHalf, 2);
        const team1Data = [...team1Top, ...team1Bottom];
        const team1Usernames = new Set(team1Data.map(p => p.username));
        const team2Data = sorted.filter(p => !team1Usernames.has(p.username));

        console.log("🔎 팀1 후보:", team1Data.map(p => p.username));
        console.log("🔎 팀2 후보:", team2Data.map(p => p.username));

        const team1Assigned = assignPlayerRoles(team1Data, parsedPlayers);
        const team2Assigned = assignPlayerRoles(team2Data, parsedPlayers);

        if (team1Assigned && team2Assigned) {
          console.log("✅ 팀 배정 성공!");
          setTeamA(team1Assigned);
          setTeamB(team2Assigned);
          setInitialTeamA(team1Assigned);
          setInitialTeamB(team2Assigned);
          success = true;

          setTimeout(() => {
            setTeamsGenerated(true); // 팀 표시용 드롭다운으로 변경
            playSound("victory.mp3");
          }, TOTAL_SLOT_TIME); // 2.5초 뒤에 전환 (슬롯 애니메이션 종료 시점)
        } else {
          console.warn("❌ 클래스 배정 실패. 다음 조합으로 재시도.");
        }

        attempt++;
      }

      if (!success) {
        alert("🚨 유효한 클래스 배정을 찾지 못했습니다. 유저들의 클래스 정보를 확인해주세요.");
      }

    } catch (error) {
      console.error("🚨 유저 데이터 요청 중 오류 발생:", error);
      alert("🚨 유저 데이터를 가져오지 못했습니다: " + error.message);
    }

  };


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

      <div className="flex flex-col items-center">
        <h1 className="text-left text-4xl font-bold mt-6 mb-2 pr-140">
          *팀 생성 (
          <span className={`${playerCount === 8 ? "text-green-400" : "text-red-400"} font-bold`}>
            {playerCount} </span>
          / 8명)
        </h1>
        <div className="flex items-center mr-[-5px] mb-4">
          <button
            onMouseDown={() => setIsClassButtonPressed(true)}
            onMouseUp={() => setIsClassButtonPressed(false)}
            onMouseLeave={() => setIsClassButtonPressed(false)}
            onClick={() => {
              if (showClassPanel) {
                setShowClassPanel(false); // 열려있으면 닫기
                return;
              }
              const rawList = players
                .replace(/\([^)]*\)/g, "")
                .split(",")
                .map((n) => n.trim())
                .filter((n) => n);

              const initialClassMap = {};
              rawList.forEach((username) => {
                initialClassMap[username] = selectedClasses[username] || [];
              });

              setSelectedClasses(initialClassMap);
              setShowClassPanel(true);

              playSound("class_open.mp3");
            }}
            disabled={!isReady}
            className="mb-6 w-[53px] h-[90px]" // 원하는 사이즈 조절 가능
          >
            <Image
              src={
                !isReady
                  ? "/icons/buttons/gem_disabled.png"
                  : isClassButtonPressed
                    ? "/icons/buttons/gem_pressed.png"
                    : "/icons/buttons/gem_default.png"
              }
              alt="클래스 지정"
              width={200}
              height={200}
            />
          </button>

          <div className="relative w-[470px] h-[60px] mb-6">
            <input
              type="text"
              value={players}
              onChange={(e) => setPlayers(e.target.value)}
              placeholder="플레이어 이름을 ,로 구분해서 입력"
              className="w-[450px] h-[60px] pl-3 pr-4 text-white bg-transparent border-none outline-none text-lg mb-6"
              style={{
                backgroundImage: "url('/icons/inputs/player_input_frame.png')", // ✅ 원하는 이미지 경로
                backgroundSize: "100% 100%",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
              }}
            />
            {/* ❌ Clear 버튼 */}
            {players && (
              <button
                onClick={() => {
                  setPlayers("");
                  setConfirmState("default");
                  setShowClassPanel(false); // 👉 사이드 패널도 닫기
                }}
                className="absolute left-[85%] top-1/2 transform -translate-y-1/2 text-white hover:text-red-400 text-xl"
                title="입력 지우기"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={() => {
              if (!isReady) return; // 8명이 아닐 경우 클릭 무시
              setIsMixPressed(true);
              generateTeams();
              setTimeout(() => setIsMixPressed(false), 500);
            }}
            className="mb-6"
            disabled={!isReady} // 시각적으로도 비활성화
          >
            <Image
              src={
                !isReady
                  ? "/icons/buttons/mix_disabled.png" // ❌ 비활성화 이미지
                  : isMixPressed
                    ? "/icons/buttons/mix_pressed.png" // ✅ 누른 상태
                    : "/icons/buttons/mix.png" // ✅ 기본
              }
              alt="MIX!"
              width={120}
              height={20}
              className={!isReady ? "opacity-60" : "opacity-100"}
            />
          </button>
          <button onClick={() => {
            setIsCopyResultPressed(true);

            playSound("alert.mp3");

            // ⚡ 복사 + alert 살짝 딜레이
            setTimeout(() => {
              copyTeamResult(teamA, teamB); // 내부에서 alert 호출
            }, 1000);

            // 이미지 복원은 1.5초 후
            setTimeout(() => setIsCopyResultPressed(false), 500);
          }} className="mb-6">
            <Image
              src={isCopyResultPressed ? "/icons/buttons/copy_result_pressed.png" : "/icons/buttons/copy_result.png"}
              alt="생성결과 복사"
              width={175}
              height={20}
            />
          </button>
        </div>

        {/* 즐겨찾기 영역 (배경 이미지 + 버튼 오버레이) */}
        <div className="relative w-[820px] h-[100px] mx-auto -mt-10">
          {/* 배경 이미지 */}
          <Image
            src="/icons/labels/favorite_title.png"
            alt="즐겨찾기 제목"
            fill
            className="object-contain"
          />

          {/* 버튼 오버레이 */}
          <div className="absolute top-1/2 left-[54%] transform -translate-x-1/2 -translate-y-1/2 flex flex-wrap justify-left gap-1 w-[90%]">
            {leaderboardTop10.map((player) => (
              <button
                key={player.username}
                onClick={() => {
                  const nameList = players.split(",").map(p => p.trim()).filter(p => p.length > 0);
                  if (!nameList.includes(player.username)) {
                    const newList = [...nameList, player.username];
                    setPlayers(newList.join(",") + ",");
                  }
                }}
                className="px-3 py-1 text-white bg-transparent border border-white rounded-full shadow-md hover:bg-white hover:text-gray-900 transition-all duration-200 text-sm"
              >
                {player.username}
              </button>
            ))}
          </div>
        </div>

        <h1 className="text-left text-4xl font-bold mt-6 mb-2 pr-150">*팀 생성 결과</h1>

        <div className="flex justify-center items-center relative">
          {/* Combined Team Image */}
          {/* 팀 생성 완료 전과 후에 다른 이미지를 표시 */}
          {teamsGenerated ? (
            <Image src="/icons/team_complete.png" alt="팀 생성 완료" width={800} height={400} />
          ) : (
            <Image src="/icons/team_combined.png" alt="팀 대결" width={800} height={400} />
          )}

          {/* Players Overlay */}
          <div className="absolute flex justify-between w-full px-5 gap-30 top-1/2">

            {/* 팀 A */}
            <div className="grid grid-cols-4 gap-4 mt-23">
              {teamA.map((player, index) => (
                <div key={index} className="p-2 bg-opacity-100 w-18 h-10 flex items-center justify-center">
                  {!teamsGenerated ? (
                    <Slot
                      nameList={teamA.map(p => p.username)} // 8명 중 랜덤 선택
                      finalName={player.username}
                      delay={index * 200}
                    />
                  ) : (
                    <select
                      value={player.username}
                      onChange={(e) => {
                        const selectedPlayer = initialTeamA.find(p => p.username === e.target.value);
                        const updated = [...teamA];
                        updated[index] = selectedPlayer;
                        setTeamA(updated);
                      }}
                      className="bg-gray-800 text-white rounded p-1 text-sm"
                    >
                      {initialTeamA.map((p, idx) => (
                        <option key={`${p.username}-${idx}`} value={p.username}>
                          {p.username}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>

            {/* 점수 선택 A팀 */}
            <div className="absolute left-[182px] transform -translate-x-1/2 text-3xl font-bold bg-gray-800 bg-opacity-100 p-1 top-[-57px]">
              <select
                value={teamAScore}
                onChange={(e) => setTeamAScore(Number(e.target.value))}
                className="bg-gray-700 text-white p-1 rounded-lg"
              >
                {[...Array(6).keys()].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>

            {/* 점수 선택 B팀 */}
            <div className="absolute right-[126px] transform -translate-x-1/2 text-3xl font-bold bg-gray-800 bg-opacity-100 p-1 top-[-57px]">
              <select
                value={teamBScore}
                onChange={(e) => setTeamBScore(Number(e.target.value))}
                className="bg-gray-700 text-white p-1 rounded-lg"
              >
                {[...Array(6).keys()].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>

            {/* 팀 B */}
            <div className="grid grid-cols-4 gap-4 mt-23">
              {teamB.map((player, index) => (
                <div key={index} className="p-2 bg-opacity-100 w-18 h-10 flex items-center justify-center">
                  {!teamsGenerated ? (
                    <Slot
                      nameList={teamB.map(p => p.username)} // 8명 중 랜덤 선택
                      finalName={player.username}
                      delay={index * 200}
                    />
                  ) : (
                    <select
                      value={player.username}
                      onChange={(e) => {
                        const selectedPlayer = initialTeamB.find(p => p.username === e.target.value);
                        const updated = [...teamB];
                        updated[index] = selectedPlayer;
                        setTeamB(updated);
                      }}
                      className="bg-gray-800 text-white rounded p-1 text-sm"
                    >
                      {initialTeamB.map((p, idx) => (
                        <option key={`${p.username}-${idx}`} value={p.username}>
                          {p.username}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 하단 버튼 영역 */}
        <div className="flex justify-center mt-8" onClick={() => {
          setIsCopyMatchPressed(true);

          playSound("alert.mp3");

          // ⚡ alert() 호출을 100ms 뒤로 지연
          setTimeout(() => {
            handleCopyMatchResult(); // 내부에서 alert 발생
          }, 1000);

          setTimeout(() => setIsCopyMatchPressed(false), 500);
        }}>
          <button className="w-48 h-12">
            <Image
              src={isCopyMatchPressed ? "/icons/buttons/copy_match_pressed.png" : "/icons/buttons/copy_match.png"}
              alt="경기결과 복사"
              width={192}
              height={48}
              style={{ height: "auto" }} // ✅ 비율 유지 
            />
          </button>
        </div>
      </div>
      {showClassPanel && (
        <div className="fixed top-[175px] left-45 h-[calc(100%-72px)] w-[350px] text-white z-50 shadow-lg p-6 overflow-y-auto" style={{
          height: "480px",
          backgroundImage: "url('/images/side_panel_bg.png')", // ✅ 실제 이미지 경로로 변경
          backgroundSize: "100% 100%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}>
          {Object.entries(selectedClasses).map(([username, selected]) => (
            <div key={username} className="mb-4 pl-3 flex items-center gap-x-5">
              <span className="w-20 text-2xl">{username}</span>
              <div className="flex gap-4">
                {["드", "어", "넥", "슴"].map((cls) => {
                  const isChecked = selected?.includes(cls);
                  return (
                    <label
                      key={cls}
                      className={`flex items-center gap-1 cursor-pointer ${isChecked ? "text-green-400 font-bold" : "text-white"} text-lg`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          setSelectedClasses((prev) => {
                            const current = prev[username] || [];
                            return {
                              ...prev,
                              [username]: e.target.checked
                                ? [...current, cls].slice(0, 3)
                                : current.filter((c) => c !== cls),
                            };
                          });
                        }}
                      />
                      {cls}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex justify-center mt-6">
            <button
              onClick={() => {
                setConfirmState("pressed");

                // 실제 동작 처리
                setTimeout(() => {
                  setConfirmState("done");
                  setShowClassPanel(false);
                }, 500); // 누른 효과 0.5초 후 완료로 변경
              }}
              onMouseDown={() => setConfirmState("pressed")}
              onMouseUp={() => setConfirmState("done")}
              className="w-[90px] h-[30px]"
            >
              <Image
                src={
                  confirmState === "pressed"
                    ? "/icons/buttons/confirm_pressed.png"
                    : confirmState === "done"
                      ? "/icons/buttons/confirm_done.png"
                      : "/icons/buttons/confirm_default.png"
                }
                alt="확인"
                width={100}
                height={30}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
