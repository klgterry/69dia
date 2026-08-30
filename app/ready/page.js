"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Slot from "@/components/Slot";
import { ClipLoader } from "react-spinners";
import {
  parsePlayersInput,
  calculateEffectiveMMR,
  getPlayerCount,
  checkClassDistribution,
  buildTeamsByPairSplit,
  violatesPairSplit,
  buildTeamsByProposal,
} from "@/lib/teamBalancer";
import { gasGet, gasPost } from "@/lib/gasClient";


async function fetchLeaderboard() {
  const response = await fetch("/api/gasApi?action=getLeaderboard");
  if (!response.ok) {
    throw new Error("Failed to fetch leaderboard");
  }
  const data = await response.json();
  return data.players || [];
}

async function fetchFavoritePlayers() {
  const response = await fetch("/api/gasApi?action=getFavoriteCandidates");
  if (!response.ok) {
    throw new Error("즐겨찾기 유저 데이터를 불러오지 못했습니다.");
  }
  const data = await response.json();
  return Array.isArray(data) ? data : []; // ✅ 배열로 바로 리턴
}

// 👇 이걸 TeamPage 컴포넌트 위에 선언
async function fetchPlayerInfo(players) {
  const data = await gasPost("getPlayersInfo", { players });
  return data.players;
}

async function fetchRegisterPassword() {
  const data = await gasGet("getRegisterPassword");
  return data.password;
}

async function fetchUserSummary() {
  const response = await fetch("/api/gasApi?action=getUserSummary");
  if (!response.ok) throw new Error("요약 데이터를 가져오지 못했습니다.");
  return await response.json(); // [{ SEASON, PLAYER, TOTAL_WINS, TOTAL_RANK, D_WINS, D_RANK, ... }]
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

// ===================== DEBUG UTILS (ADD) =====================
function dbgTitle(title) {
  console.log(`\n\n════════════════════════════════════════════════════`);
  console.log(`🔎 ${title}`);
  console.log(`════════════════════════════════════════════════════`);
}

function fmtTeam(arr) {
  if (!arr) return '[]';
  return '[' + arr.map(p => `${p.username}(${Math.round(p.effectiveMMR ?? p.mmr ?? 0)})`).join(', ') + ']';
}

// ================== END DEBUG UTILS (ADD) ====================

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
  const [isTop10Loading, setIsTop10Loading] = useState(true);
  const playerCount = getPlayerCount(players);
  const isReady = playerCount === 8;
  const [isGuideButtonPressed, setIsGuideButtonPressed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [registerPassword, setRegisterPassword] = useState("");
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [correctPassword, setCorrectPassword] = useState("");
  const [isPasswordError, setIsPasswordError] = useState(false);
  const [isConfirmPhase, setIsConfirmPhase] = useState(false);
  const [isRegisterPressed, setIsRegisterPressed] = useState(false); // 클릭 효과
  const [showRegisterPopup, setShowRegisterPopup] = useState(false); // 팝업 표시 여부
  const [inputSubmittedBy, setInputSubmittedBy] = useState(""); // 등록자명
  const [isRegisterLoading, setRegisterLoading] = useState(false);
  const [gameNumber, setGameNumber] = useState("");
  const [winTarget, setWinTarget] = useState(4); // 기본은 3선승
  const [favorites, setFavorites] = useState([]);
    
  // useEffect(() => {
  //   setIsTop10Loading(true);
  //   fetchLeaderboard().then(players => {
  //     const top10 = players
  //       .filter(p => p.wins >= 1)
  //       .sort((a, b) => a.rank - b.rank)
  //       .slice(0, 24);
  //     setLeaderboardTop10(top10);
  //     setIsTop10Loading(false);
  //   }).catch(err => console.error("랭킹 데이터 불러오기 실패:", err));
  // }, []);

  useEffect(() => {
    setIsTop10Loading(true);
    fetchFavoritePlayers()
      .then((players) => {
        setLeaderboardTop10(players); // 이제 names는 ["플레이어1", "플레이어2", ...]
        setIsTop10Loading(false);
      })
      .catch(err => console.error("랭킹 데이터 불러오기 실패:", err));
  }, []);

  const handleCopyMatchResult = () => {
    const aNames = teamA.map(p => p.username || p).join("/");
    const bNames = teamB.map(p => p.username || p).join("/");
    const result = `!결과등록 [아래${teamAScore}]${aNames} vs [위${teamBScore}]${bNames}`;

    // ✅ 복사 기준으로 현재 클래스 저장
    const newFinalClasses = {};
    [...teamA, ...teamB].forEach(p => {
      const username = p.username || p;
      const cls = p.class;
      if (username && cls) {
        newFinalClasses[username] = cls;
      }
    });
    setFinalClasses(newFinalClasses);

    // 🎯 디버깅용 로그
    console.log("📌 [handleCopyMatchResult] 클래스 및 결과 복사 완료");
    console.log("╔════════════╦════════════════╗");
    console.log("║   유저명    ║ 클래스(Rematch) ║");
    console.log("╠════════════╬════════════════╣");
    Object.entries(newFinalClasses).forEach(([name, cls]) => {
      console.log(`║ ${name.padEnd(10)} ║ ${cls.padEnd(12)} ║`);
    });
    console.log("╚════════════╩════════════════╝");

    // 💡 팀 색상 갱신
    setPreviousTeamMap(
      Object.fromEntries([
        ...teamA.map(p => [p.username, "A"]),
        ...teamB.map(p => [p.username, "B"]),
      ])
    );

    navigator.clipboard.writeText(result)
      .then(() => alert(`✅ 생성결과가 클립보드에 복사되었습니다!\n\n${result}`))
      .catch(() => alert("❌ 복사 실패!"));

    console.log("📋 복사된 내용:", result);
  };

  // generateTeams 리팩터링: default / rematch 분기
  const [teamMode, setTeamMode] = useState("default");
  const [previousTeamMap, setPreviousTeamMap] = useState({});
  const [finalClasses, setFinalClasses] = useState({});

  const generateTeams = async () => {
    playSound("mix.mp3");
    setTeamsGenerated(false);

    const rawInput = players.trim();
    const playerList = rawInput.split(',').map(p => p.trim()).filter(p => p !== '');

    console.log("🎮 generateTeams 실행됨. 현재 팀 모드:", teamMode);
    console.log("🧑‍🤝‍🧑 플레이어 목록:", playerList);

    if (playerList.length !== 8) {
      alert("8명의 플레이어를 입력해주세요.");
      return;
    }

    const { parsed: parsedPlayers, errors: classInputErrors } = parsePlayersInput(players);
    if (classInputErrors.length > 0) {
      alert(
        classInputErrors
          .map(
            (e) =>
              `🚨 ${e.username}의 클래스는 최대 3개까지만 입력 가능합니다!\n현재 입력된 클래스: ${e.classes.join(", ")}`
          )
          .join("\n\n")
      );
    }

    for (const p of playerList) {
      parsedPlayers[p] = selectedClasses[p] || [];
    }

    const userSummary = await fetch("/api/gasApi?action=getCurrentSeasonSummary")
      .then(res => res.json());

    console.log("📄 최신 시즌 유저 요약:", userSummary);

    if (!userSummary || userSummary.length === 0) {
      console.warn("⚠️ 최신 시즌 유저 요약 데이터가 없습니다.");
      return;
    }

    // ✅ recentClassMap 생성 (PLAYER 기준!)
    const recentClassMap = {};
    userSummary.forEach((user) => {
      const username = (user.PLAYER || "").trim(); // ✅ 정확히 player 명으로
      const recentClass = (user.RECENT_GAME_1_CLASS || "").trim();

      if (username && recentClass) {
        recentClassMap[username] = recentClass;
      }
    });
    console.log("🧭 유저별 최근 클래스 맵:", recentClassMap);

    // ✅ parsedPlayers 확장
    Object.keys(parsedPlayers).forEach((usernameRaw) => {
      const username = usernameRaw.trim();
      const preferred = parsedPlayers[usernameRaw];
      const recent = teamMode === "rematch"
      ? finalClasses[username] || null  // 리매치일 때는 복사된 현재 클래스
      : recentClassMap[username] || null;  // 기본은 UserSummary에서

      parsedPlayers[usernameRaw] = {
        preferred,
        recent,
      };

      console.log(`👤 ${username} → preferred: ${JSON.stringify(preferred)}, recent: ${recent}`);
    });

    const playerData = await fetchPlayerInfo(playerList);
    const classCheck = checkClassDistribution(playerData);
    if (!classCheck.ok) {
      alert(`🚨 클래스 분포가 부족합니다!\n❌ 부족한 클래스: ${classCheck.missing.join(", ")}`);
      return;
    }
    const enrichedPlayerData = calculateEffectiveMMR(playerData, parsedPlayers);
    const sorted = enrichedPlayerData.sort((a, b) => b.effectiveMMR - a.effectiveMMR);

    console.log("📊 정렬된 플레이어 MMR:", sorted.map(p => ({ username: p.username, mmr: p.effectiveMMR })));

    if (teamMode === "default") {
       setFinalClasses({});
      runInitialTeamGeneration(sorted, parsedPlayers);
    } else if (teamMode === "rematch") {
      runRematchWithSwap(sorted, parsedPlayers);
    }
  };

  // ✅ 초기 팀 생성: 1&2, 7&8 강제 분리 + 풍부한 로그
  const runInitialTeamGeneration = (sorted, parsedPlayers) => {
    dbgTitle('🚀 초기 팀 생성 (제안서 Step1/Step2)');

    const { teamAData, teamBData } = buildTeamsByProposal(sorted);

    console.log('assignPlayerRoles 시작 (teamA)');
    const team1Assigned = assignPlayerRoles(teamAData, parsedPlayers);
    console.log('assignPlayerRoles 시작 (teamB)');
    const team2Assigned = assignPlayerRoles(teamBData, parsedPlayers);

    if (!team1Assigned || !team2Assigned) {
      console.log('❌ 클래스 배정 실패. teamA:', team1Assigned, 'teamB:', team2Assigned);
      alert('클래스 배정에 실패했습니다. 다시 시도해 주세요.');
      return;
    }

    const summarize = (team, label) => {
      console.log(`\n[${label}] 최종 배정 요약`);
      team.forEach(p => {
        const recent = parsedPlayers[p.username]?.recent ?? '-';
        console.log(`  - ${p.username} :: class=${p.class}, effMMR=${Math.round(p.effectiveMMR)}, recent=${recent}`);
      });
    };
    summarize(team1Assigned, 'TEAM A');
    summarize(team2Assigned, 'TEAM B');

    setTeamA(team1Assigned);
    setTeamB(team2Assigned);
    setInitialTeamA(team1Assigned);
    setInitialTeamB(team2Assigned);
    setTeamAScore(0);
    setTeamBScore(0);
    setPreviousTeamMap(Object.fromEntries([
      ...team1Assigned.map(p => [p.username, 'A']),
      ...team2Assigned.map(p => [p.username, 'B']),
    ]));
    setTeamMode('rematch');

    setTimeout(() => {
      setTeamsGenerated(true);
      playSound('victory.mp3');
      console.log('🎉 팀 생성 완료! teamsGenerated=true');
    }, TOTAL_SLOT_TIME);
  };

  const runRematchWithSwap = (sorted, parsedPlayers) => {
    console.log("🔁 리매치 모드 시작 – 기존 팀 상태:", previousTeamMap);

    let attempt = 0;
    const maxAttempts = 30; // 약간 여유
    let success = false;

    while (attempt < maxAttempts && !success) {
      console.log(`\n🔁 리매치 시도 #${attempt + 1}`);

      // 🔁 쌍 분할로 후보 팀 만들기
      const { teamAData, teamBData, pairs } = buildTeamsByPairSplit(sorted);

      // 🔒 쌍 분할 위반 방지(이론상 없지만 방어)
      const violates =
        violatesPairSplit(teamAData, pairs, sorted) ||
        violatesPairSplit(teamBData, pairs, sorted);
      if (violates) {
        console.log('🚫 쌍 분할 위반 → 다음 시도');
        attempt++;
        continue;
      }

      // 🎭 클래스 배정
      console.log('assignPlayerRoles(teamA) 실행');
      const team1Assigned = assignPlayerRoles(teamAData, parsedPlayers);
      console.log('assignPlayerRoles(teamB) 실행');
      const team2Assigned = assignPlayerRoles(teamBData, parsedPlayers);

      if (!team1Assigned || !team2Assigned) {
        console.log('❌ 클래스 배정 실패 → 다음 시도');
        attempt++;
        continue;
      }

      // 평균 MMR 로그(선택)
      const avg = (t) => Math.round(t.reduce((s, p) => s + (p.effectiveMMR||0), 0) / t.length);
      console.log(`TEAM A: ${fmtTeam(team1Assigned)}, avg=${avg(team1Assigned)}`);
      console.log(`TEAM B: ${fmtTeam(team2Assigned)}, avg=${avg(team2Assigned)}`);

      // 🎨 색 유지 규칙: 이전 A 2명, 이전 B 2명 유지
      const countMatches = (team, label) => team.filter(p => previousTeamMap[p.username] === label).length;
      const keepRule =
        countMatches(team1Assigned, 'A') === 2 &&
        countMatches(team2Assigned, 'B') === 2;

      console.log(`검증 → keep2:${keepRule ? 'OK' : 'NG'}`);

      if (keepRule) {
        console.log('✅ 리매치 유효 조합 확정! 상태 반영');
        setTeamA(team1Assigned);
        setTeamB(team2Assigned);
        setInitialTeamA(team1Assigned);
        setInitialTeamB(team2Assigned);
        setTeamAScore(0);
        setTeamBScore(0);
        setTimeout(() => {
          setTeamsGenerated(true);
          playSound('victory.mp3');
          console.log('🎉 리매치 완료! teamsGenerated=true');
        }, TOTAL_SLOT_TIME);
        success = true;
      } else {
        console.log('↩️ 조건 불충족 → 다음 시도');
      }

      attempt++;
    }

    if (!success) {
      console.warn('⚠️ 조건을 만족하는 새로운 조합을 찾지 못했습니다.');
      alert('⚠️ 조건을 만족하는 새로운 조합을 찾지 못했습니다. 다시 시도해 주세요.');
    }
  };


  function assignPlayerRoles(team, parsedPlayers) {
    const positions = ["드", "어", "넥", "슴"];
    const assigned = [];
    const used = new Set();

    // 🎲 클래스 랜덤 섞기 (3회 반복)
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

    console.log("👥 [배정 대상 팀]:", team.map(p => p.username));
    console.log("📌 [parsedPlayers]:", parsedPlayers);

    // 🔒 1. 단일 지정 클래스 우선 배정
    for (const pos of positions) {
      for (const player of team) {
        const username = player.username;
        if (used.has(username)) continue;

        const preferred = parsedPlayers[username]?.preferred;
        if (preferred && preferred.length === 1 && preferred[0] === pos) {
          assigned.push({ ...player, class: pos });
          used.add(username);
          console.log(`🔒 [단일지정] ${username} → ${pos}`);
          break;
        }
      }
    }

    // ✅ 2. 다중 지정 클래스 우선 배정
    for (const pos of positions) {
      for (const player of team) {
        const username = player.username;
        if (used.has(username)) continue;

        const preferred = parsedPlayers[username]?.preferred;
        if (preferred && preferred.includes(pos)) {
          assigned.push({ ...player, class: pos });
          used.add(username);
          console.log(`✅ [지정우선] ${username} → ${pos}`);
          break;
        }
      }
    }

    // 🌀 3. 자동 배정 (recent 클래스 회피 시도)
    for (const pos of positions) {
      if (assigned.some(p => p.class === pos)) {
        console.log(`🚫 [건너뜀] ${pos} 클래스는 이미 배정 완료`);
        continue;
      }

      const candidates = team.filter(p => {
        const username = p.username;
        if (used.has(username)) return false;
        const available = p.class.split(",").map(c => c.trim());
        return available.includes(pos);
      });

      console.log(`🔍 [${pos}] 배정 후보:`, candidates.map(c => c.username));

      const [avoidRecent, allowRecent] = [[], []];

      for (const player of candidates) {
        const username = player.username;
        const recent = parsedPlayers[username]?.recent;

        if (recent && recent === pos) {
          console.log(`⚠️ [${username}] 최근 클래스(${recent})와 같음 → 후순위`);
          allowRecent.push(player);
        } else {
          avoidRecent.push(player);
        }
      }

      const pickFrom = avoidRecent.length > 0 ? avoidRecent : allowRecent;

      if (pickFrom.length > 0) {
        const selected = pickFrom[Math.floor(Math.random() * pickFrom.length)];
        assigned.push({ ...selected, class: pos });
        used.add(selected.username);
        console.log(`🌀 [자동배정] ${selected.username} → ${pos} (${avoidRecent.length === 0 ? "❗ 최근 클래스 허용" : "✅ 회피 성공"})`);
      } else {
        console.warn(`❌ [실패] ${pos}에 배정 가능한 유저 없음`);
        return null;
      }
    }

    // 📐 4. 정렬: 드 → 어 → 넥 → 슴
    const positionOrder = { "드": 0, "어": 1, "넥": 2, "슴": 3 };
    assigned.sort((a, b) => positionOrder[a.class] - positionOrder[b.class]);
    
    // 🎯 4. 최종 배정 결과 요약 출력
    console.log("📊 [최종 클래스 배정 요약]");
    console.log("╔════════════╦════════╦════════════╦═════╗");
    console.log("║   유저명    ║ 클래스 ║ 최근 클래스 ║ 체크 ║");
    console.log("╠════════════╬════════╬════════════╬═════╣");

    assigned.forEach((p) => {
      const username = p.username.padEnd(10); // 10자 기준 좌측 정렬
      const assignedClass = p.class.padEnd(4);
      const recentClass = (parsedPlayers[p.username]?.recent || "-").padEnd(6);
      const isSame = assignedClass.trim() === recentClass.trim();
      const check = isSame ? "❗" : "✔️";

      console.log(`║ ${username} ║  ${assignedClass} ║     ${recentClass} ║  ${check}  ║`);
    });

    console.log("╚════════════╩════════╩════════════╩═════╝");

    return assigned;
  }


  const [lastPlayerList, setLastPlayerList] = useState([]);

  useEffect(() => {
    const currentList = players
      .replace(/\([^)]*\)/g, "")
      .split(',')
      .map(n => n.trim())
      .filter(n => n);

    if (lastPlayerList.length === 8 && currentList.length === 8) {
      const isSame = currentList.every(name => lastPlayerList.includes(name));
      if (!isSame) {
        console.log("🔄 유저 목록 변경 감지됨. 초기화 수행");
        setTeamMode("default");
        setPreviousTeamMap({});
      }
    }

    setLastPlayerList(currentList);
  }, [players]);

  const getDropdownBgClass = (username) => {
    if (previousTeamMap[username] === "A") return "bg-red-900";
    if (previousTeamMap[username] === "B") return "bg-blue-900";
    return "";
  };

  useEffect(() => {
    if (showRegisterPopup) {
      fetchRegisterPassword().then(setCorrectPassword);
    }
  }, [showRegisterPopup]);

  const handlePasswordSubmit = () => {
    if (inputPassword === correctPassword) {
      setIsPasswordError(false);
      setIsConfirmPhase(true);
    } else {
      setIsPasswordError(true);
    }
  };
  
  const getKSTGameNumber = () => {
    const kst = new Date(); // 브라우저 로컬 시간을 그대로 사용
    const yy = String(kst.getFullYear()).slice(2);
    const MM = String(kst.getMonth() + 1).padStart(2, "0");
    const dd = String(kst.getDate()).padStart(2, "0");
    const HH = String(kst.getHours()).padStart(2, "0");
    const mm = String(kst.getMinutes()).padStart(2, "0");
    const ss = String(kst.getSeconds()).padStart(2, "0");
    return `${yy}${MM}${dd}${HH}${mm}${ss}`;
  };
   
  
  const handleRegister = async () => {
    try {
      setRegisterLoading(true);
  
      const finalNumber = gameNumber || getKSTGameNumber();
      if (!gameNumber) setGameNumber(finalNumber); // 상태 저장
      console.log("🆔 생성된 게임번호:", finalNumber);
  
      // ✅ 점수 비교 후 승/패 결정
      let winners, losers, winScore, loseScore;
  
      if (teamAScore > teamBScore) {
        winners = teamA.map(p => p.username);
        losers = teamB.map(p => p.username);
        winScore = teamAScore;
        loseScore = teamBScore;
      } else {
        winners = teamB.map(p => p.username);
        losers = teamA.map(p => p.username);
        winScore = teamBScore;
        loseScore = teamAScore;
      }
  
      const payload = {
        action: "registerResult",
        game_number: finalNumber,
        winners,
        losers,
        win_score: winScore,
        lose_score: loseScore,
        submitted_by: inputSubmittedBy || "웹 사용자",
      };
  
      console.log("📦 보낼 payload:", payload);
  
      const res = await fetch("/api/gasApi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
  
      console.log("📡 응답 상태 코드:", res.status);
  
      const resultText = await res.text(); // 먼저 text로 받기
      console.log("🔁 응답 원문(text):", resultText);
  
      let result;
      try {
        result = JSON.parse(resultText); // JSON 파싱 시도
      } catch (parseError) {
        console.error("❌ JSON 파싱 실패:", parseError.message);
        alert("🚨 응답 파싱 실패! 원문 확인:\n" + resultText);
        return;
      }
  
      console.log("✅ 파싱된 응답 결과:", result);
  
      if (res.ok) {
        if (result.success) {
          alert("✅ 경기 결과가 성공적으로 등록되었습니다!");
          playSound("victory.mp3");
          setGameNumber(""); // 초기화
        } else {
          alert(`🚨 등록 실패: ${result.error || "알 수 없는 오류"}`);
        }
      } else {
        alert("🚨 서버 오류로 등록에 실패했습니다.");
      }
  
    } catch (error) {
      console.error("❌ 등록 중 예외 발생:", error);
      alert("🚨 네트워크 오류 또는 서버 응답 없음");
    } finally {
      setRegisterLoading(false);
      setShowRegisterPopup(false);
      setIsConfirmPhase(false);
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

      <div className="flex flex-col items-center">
        <h1 className="text-left text-4xl font-bold mt-10 mb-2 pr-115">
          * MMR 팀 생성 (
          <span className={`${playerCount === 8 ? "text-green-400" : "text-red-400"} font-bold`}>
            {playerCount} </span>
          / 8명)
        </h1>
        <div className="flex items-center mr-[120px] mb-4 -mt-4">
          <button
            onMouseDown={() => setIsGuideButtonPressed(true)}
            onMouseUp={() => setIsGuideButtonPressed(false)}
            onMouseLeave={() => setIsGuideButtonPressed(false)}
            onClick={() => setShowGuide(true)}
            className="mb-6 w-[115px] h-[90px] mr-[10px]"
          >
            <Image
              src={
                isGuideButtonPressed
                  ? "/icons/buttons/guide_pressed.png" // 두 번째 이미지
                  : "/icons/buttons/guide_default.png" // 첫 번째 이미지
              }
              alt="사용법"
              width={200}
              height={200}
            />
          </button>

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

                  // ✅ 팀 관련 상태 초기화
                  setTeamA([]);
                  setTeamB([]);
                  setInitialTeamA([]);
                  setInitialTeamB([]);
                  setTeamAScore(0);
                  setTeamBScore(0);
                  setTeamsGenerated(false);
                  setTeamMode("default");
                  setPreviousTeamMap({});
                  setLastPlayerList([]);
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
            className="mb-6 ml-[-10px]"
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
          <button
            onClick={() => {
              setIsCopyResultPressed(true);
              playSound("alert.mp3");

              setTimeout(() => {
                copyTeamResult(teamA, teamB); // 복사 + alert
                // ✅ 팀 색깔 업데이트
                setPreviousTeamMap(
                  Object.fromEntries([
                    ...teamA.map(p => [p.username, "A"]),
                    ...teamB.map(p => [p.username, "B"]),
                  ])
                );
              }, 1000);

              setTimeout(() => setIsCopyResultPressed(false), 500);
            }}
            className="mb-6 ml-[10px]"
          >
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
          <Image
    src="/icons/labels/favorite_title.png"
    alt="즐겨찾기 제목"
    fill
    className="object-fill" // 비율 무시하고 컨테이너 꽉 채움
  />

          <div className="absolute top-1/2 left-[54%] transform -translate-x-1/2 -translate-y-1/2 flex flex-wrap justify-left gap-1 w-[90%]">
            {isTop10Loading ? (
              <span className="text-white text-sm">🚀 즐겨찾기 데이터를 불러오는 중입니다...</span>
            ) : (
              leaderboardTop10.map((player) => (
                <button
                  key={player}
                  onClick={() => {
                    const nameList = players.split(",").map(p => p.trim()).filter(p => p.length > 0);
                    if (!nameList.includes(player)) {
                      const newList = [...nameList, player];
                      setPlayers(newList.join(",") + ",");
                    }
                  }}
                  className="px-3 py-1 text-white bg-transparent border border-white rounded-full shadow-md hover:bg-white hover:text-gray-900 transition-all duration-200 text-sm"
                >
                  {player}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center mt-6 mb-2">
          <h1 className="text-left text-4xl font-bold">
            * 팀 생성 결과
          </h1>

          <div className="flex items-center gap-2 mr-4 pr-100 ml-5">
            {[
              { value: 3, label: "3선승" },
              { value: 4, label: "4선승" },
              { value: 5, label: "5선승" },
            ].map((option) => (
              <label
                key={option.value}
                className={`inline-flex items-center gap-1 ${
                  winTarget === option.value ? "text-green-400 font-bold" : "text-white"
                }`}
              >
                <input
                  type="radio"
                  name="roundType"
                  value={option.value}
                  checked={winTarget === option.value}
                  onChange={() => setWinTarget(option.value)}
                  className="form-radio accent-green-400 text-green-400 focus:ring-0"
                />
                {option.label}
              </label>
            ))}
          </div>

        </div>
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
                <div key={index} className={`p-2 w-18 h-10 flex items-center justify-center rounded ${getDropdownBgClass(player.username)}`}>
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
                {[...Array(winTarget + 1).keys()].map(num => (
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
                {[...Array(winTarget + 1).keys()].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>

            {/* 팀 B */}
            <div className="grid grid-cols-4 gap-4 mt-23">
              {teamB.map((player, index) => (
                <div key={index} className={`p-2 w-18 h-10 flex items-center justify-center rounded ${getDropdownBgClass(player.username)}`}>
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
        <div className="flex justify-center mt-8 gap-4">
          {/* 🟢 경기결과 복사 버튼 */}
          <button
            className="w-48 h-12"
            onClick={() => {
              setIsCopyMatchPressed(true);
              playSound("alert.mp3");

              setTimeout(() => {
                const total = teamAScore + teamBScore;
              
                if (teamAScore === 0 && teamBScore === 0) {
                  alert("⚠️ 경기 결과가 없습니다!\n점수를 입력한 후 복사해주세요.");
                  return;
                }
              
                const isTie = teamAScore === winTarget && teamBScore === winTarget;
                const isWinnerValid = teamAScore === winTarget || teamBScore === winTarget;
                const isTotalExceeded = total > winTarget * 2 - 1;
              
                // ✅ 콜드게임 체크 (4선승 모드일 때 3:0 또는 0:3은 정상)
                const isColdGame =
                  winTarget === 4 &&
                  (
                    (teamAScore === 3 && teamBScore === 0) ||
                    (teamAScore === 0 && teamBScore === 3)
                  );
              
                if ((!isWinnerValid || isTie || isTotalExceeded) && !isColdGame) {
                  alert(
                    `🚨 점수 입력 오류!\n❗ 승자는 반드시 ${winTarget}점이어야 하며, 최대 점수는 ${winTarget}:${winTarget - 1}입니다.`
                  );
                } else {
                  handleCopyMatchResult();  // 정상 복사 진행
                }
              }, 1000);                      

              setTimeout(() => setIsCopyMatchPressed(false), 500);
            }}
          >
            <Image
              src={
                isCopyMatchPressed
                  ? "/icons/buttons/copy_match_pressed.png"
                  : "/icons/buttons/copy_match.png"
              }
              alt="경기결과 복사"
              width={192}
              height={48}
              style={{ height: "auto" }}
            />
          </button>
        </div>
        {/* ✅ (1) 비밀번호 입력 팝업 */}
        {showRegisterPopup && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-60 z-50 flex items-center justify-center">
          <div className="bg-gray-900 text-white p-6 rounded-lg shadow-lg w-[420px]">
            {!isConfirmPhase ? (
              <>
                <h2 className="text-2xl font-bold mb-4 text-white">🔐 결과 등록 비밀번호</h2>
                <input
                  type="password"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded bg-gray-800 text-white placeholder-gray-400"
                  placeholder="비밀번호 입력"
                />
                {isPasswordError && (
                  <p className="text-red-400 text-sm mt-2">❌ 비밀번호가 틀렸습니다.</p>
                )}
                <div className="flex justify-end gap-4 mt-4">
                  <button
                    onClick={() => {
                      setShowRegisterPopup(false);
                      setInputPassword("");
                      setIsPasswordError(false);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
                  >
                    취소
                  </button>
                  <button
                    onClick={handlePasswordSubmit}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
                  >
                    확인
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* ✅ 점수 기준으로 승패 표시용 계산 */}
                {(() => {
                  const isTeamAWin = teamAScore > teamBScore;
                  const displayTeamWin = isTeamAWin ? teamA : teamB;
                  const displayTeamLose = isTeamAWin ? teamB : teamA;
                  const displayScoreWin = isTeamAWin ? teamAScore : teamBScore;
                  const displayScoreLose = isTeamAWin ? teamBScore : teamAScore;

                  return (
                    <>
                      <h2 className="text-2xl font-bold mb-4 text-white">📥 경기 결과를 등록할까요?</h2>
                      <p className="mb-4 text-sm text-gray-100 leading-relaxed">
                        <span className="font-bold text-green-400">승리팀({displayScoreWin}) :</span>{" "}
                        {displayTeamWin.map((p) => p.username).join("/")}<br />
                        <span className="font-bold text-red-400">패배팀({displayScoreLose}) :</span>{" "}
                        {displayTeamLose.map((p) => p.username).join("/")}
                      </p>
                    </>
                  );
                })()}

                {/* ✅ 등록자명 입력 필드 */}
                <h2 className="text-lg font-semibold mb-2 text-white">👤 등록자</h2>
                <input
                  type="text"
                  value={inputSubmittedBy}
                  onChange={(e) => setInputSubmittedBy(e.target.value)}
                  className="w-full px-3 py-2 border rounded bg-gray-800 text-white placeholder-gray-400 mb-4"
                  placeholder="등록자를 입력하세요"
                />

              <div className="flex justify-end gap-4 mt-4">
                <button
                  onClick={() => {
                    setShowRegisterPopup(false);
                    setIsConfirmPhase(false);
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-400"
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    setRegisterLoading(true);
                    await handleRegister();
                    setRegisterLoading(false);
                    setShowRegisterPopup(false);
                    setIsConfirmPhase(false);
                  }}
                  disabled={isRegisterLoading || !inputSubmittedBy.trim()} // ← 등록자명이 없으면 비활성화
                  className={`px-4 py-2 flex items-center justify-center text-white rounded ${
                    isRegisterLoading ? "bg-gray-600 cursor-not-allowed" : "bg-green-600 hover:bg-green-500"
                  }`}
                >
                  {isRegisterLoading ? (
                    <ClipLoader size={20} color="#fff" />
                  ) : (
                    "✅ 등록하기"
                  )}
                </button>
              </div>

              </>
            )}
          </div>
        </div>
      )}
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
                          if (confirmState === "done") {
                            setConfirmState("default");
                          }
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
                  playSound("class_open.mp3");
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
      {showGuide && (
        <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center">
          <div className="relative">
            <img
              src="/team_manual.png" // 업로드한 매뉴얼 이미지 경로
              alt="사용법 매뉴얼"
              className="max-w-[90vw] max-h-[90vh] rounded-lg"
            />
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-2 right-2 text-white text-2xl bg-black bg-opacity-60 px-2 py-1 rounded hover:text-red-400"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
