"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";

// SSR 비활성화된 동적 import
const RouletteClient = dynamic(() => import("@/components/RouletteClient"), {
  ssr: false,
});


// ✅ GAS API 호출: prize 데이터 가져오기
async function fetchPrizeData() {
  const response = await fetch("/api/gasApi?action=getPrizeData");
  if (!response.ok) {
    throw new Error("Failed to fetch prize data");
  }
  const data = await response.json();
  console.log("🎁 가져온 prize 데이터:", data);
  return data;
}

function Tooltip({ children, content, top, left, width }) {
    const [show, setShow] = useState(false);
  
    return (
      <div
        className="absolute"
        style={{ top: `${top}px`, left: `${left}px`, width: `${width}px`, height: "60px" }}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        <div className="flex items-center px-2 text-xl text-white text-left whitespace-normal break-words leading-snug h-full">
          {children}
        </div>
        {show && (
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-50 bg-gray-800 text-white text-lg p-2 rounded shadow-md border border-gray-600 whitespace-pre-wrap w-[300px] text-left">
            {content}
          </div>
        )}
      </div>
    );
  }



async function fetchUserSummary() {
  const response = await fetch("/api/gasApi?action=getUserSummary");
  if (!response.ok) throw new Error("요약 데이터를 가져오지 못했습니다.");
  return await response.json(); // [{ SEASON, PLAYER, TOTAL_WINS, TOTAL_RANK, D_WINS, D_RANK, ... }]
}

export default function PrizePage() {
  const [prizeData, setPrizeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const [userSummary, setUserSummary] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [rouletteItems, setRouletteItems] = useState([]);

  function getParticipantsBySeason(data, season) {
  return data
    .filter((row) => row.SEASON === season)
    .map((row) => row.PLAYER);
  }

  const handleSpinRoulette = (season) => {
    const participants = getParticipantsBySeason(userSummary, season);
    console.log("🔍 시즌 참여자 목록:", participants);

    // ✅ 모든 참가자가 유효한 string인지 필터링
    const items = participants
      .filter((name) => typeof name === "string" && name.trim() !== "")
      .map((name) => ({ option: name }));

    console.log("🎯 룰렛에 전달될 items:", items);

    // ✅ 모든 항목이 `{ option: string }` 형태인지 확인
    const isValid = Array.isArray(items) && items.every(item =>
      item && typeof item.option === "string" && item.option.trim() !== ""
    );

    if (!isValid || items.length === 0) {
      alert("해당 시즌의 유효한 참여자가 없습니다.");
      return;
    }

    setRouletteItems(items);
    setSelectedSeason(season);
  };



  useEffect(() => {
    fetchPrizeData()
      .then((data) => {
        setPrizeData(data);
        setLoading(false);
      })
      .catch((error) => {
        setError(error.message);
        setLoading(false);
      });

      // ✅ userSummary도 함께 불러오기
      fetchUserSummary().then((data) => setUserSummary(data));
  }, []);

  if (error) return <div>Error: {error}</div>;

  const baseTop = 130; // 시즌 시작 위치
  const rowHeight = 64; // 줄 간격 (이미지에 맞춰 조정)

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

      {/* 표 영역 */}
      <div className="relative w-[800px] h-[1100px] mx-auto mt-10">
        {/* 배경 이미지 */}
        <Image
          src="/icons/prize_table.png"
          alt="상품후원표"
          fill
          className="object-contain"
        />

        {/* 칼럼명 */}
        {/* 시즌 칼럼명 (아이콘 없음) */}
        <div className="absolute top-[100px] left-[80px] w-[200px] h-[40px] flex items-center px-2 text-yellow-400 font-bold text-4xl">
        시즌
        </div>

        {/* 상품후원 칼럼명 (스폰서 뱃지) */}
        <div className="absolute top-[100px] left-[200px] w-[210px] h-[40px] flex items-center gap-2 px-2 text-yellow-400 font-bold text-4xl">
        <Image
            src="/icons/sponsor.png"
            alt="스폰서 아이콘"
            width={48}
            height={48}
            className="object-contain"
        />
        상품후원
        </div>

        {/* 상품당첨 칼럼명 (기프트 뱃지) */}
        <div className="absolute top-[100px] left-[480px] w-[210px] h-[40px] flex items-center gap-2 px-2 text-yellow-400 font-bold text-4xl">
        <Image
            src="/icons/gift.png"
            alt="기프트 아이콘"
            width={48}
            height={48}
            className="object-contain"
        />
        상품당첨
        </div>


        {/* 데이터 출력 */}
        {prizeData.map((row, idx) => {
        const top = 165 + idx * 75; // 줄 시작 y좌표

        return (
            <div key={idx}>
            {/* 시즌 */}
            <div
                className="absolute left-[40px] w-[200px] h-[60px] flex items-center px-2 text-2xl text-white text-left truncate"
                style={{ top: `${top}px` }}
            >
                {row.season || "-"}
            </div>
              {/* 상품후원 */}
              <Tooltip
                content={row.sponsor_detail}
                top={top}
                left={200}
                width={210}
              >
                {row.sponsor || "-"}
              </Tooltip>

              {/* 상품당첨 */}
              <Tooltip
                content={row.winner_detail}
                top={top}
                left={420}
                width={210}
              >
                {row.winner || "-"}
              </Tooltip>

              <button
                className="absolute right-[50px] top-[calc(50%-16px)] bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded shadow-md text-sm"
                style={{ top: `${top + 15}px` }} // 위치 조절 필요
                onClick={() => handleSpinRoulette(row.season)}
              >
                룰렛
              </button>
            </div>
        );
        })}
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="text-center text-xl text-gray-300 mt-6">
          <div className="animate-spin inline-block w-12 h-12 border-4 border-t-4 border-gray-600 border-solid rounded-full"></div>
          <p>로딩 중...</p>
        </div>
      )}

      {selectedSeason && (
  <RouletteModal
    season={selectedSeason}
    participants={
      userSummary
        .filter((row) => row.SEASON === selectedSeason)
        .map((row) => ({
          name: row.PLAYER,
          rank: Number(row.TOTAL_RANK || 999),
        }))
    }
    onClose={() => setSelectedSeason(null)}
  />
)}

    </div>
  );
}

function RouletteModal({ season, participants, onClose }) {
  const [minRank, setMinRank] = useState(1);
  const [maxRank, setMaxRank] = useState(15);
  const [ticketRanges, setTicketRanges] = useState([{ from: 1, to: 10, count: 1 }]);
  const [extraInput, setExtraInput] = useState("");
  const [excludeWinners, setExcludeWinners] = useState(true);
  const [winnerList, setWinnerList] = useState([]);
  const [rouletteItems, setRouletteItems] = useState([]);
  const [spinningKey, setSpinningKey] = useState(0);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [appliedUsers, setAppliedUsers] = useState([]);
  const [winner, setWinner] = useState(null);
  const [shouldSpin, setShouldSpin] = useState(false);

  const handleMinRankChange = (e) => {
    const value = e.target.value;
    setMinRank(value === "" ? 1 : Number(value)); // 빈값일 때 기본값 1
  };

  const handleMaxRankChange = (e) => {
    const value = e.target.value;
    setMaxRank(value === "" ? 15 : Number(value)); // 빈값일 때 기본값 15
  };

  const winAudioRef = useRef(null);
  
    const stopWinSound = () => {
      if (winAudioRef.current) {
        winAudioRef.current.pause();
        winAudioRef.current.currentTime = 0;
      }
    };

  useEffect(() => {
    if (!winner) return; // 당첨자 없으면 이벤트 등록 X

    const handleClick = () => {
      setWinner(null); // 클릭하면 당첨자 화면 제거
      stopWinSound();
    };

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [winner]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  useEffect(() => {
    const matched = participants
      .filter((user) => user.rank >= minRank && user.rank <= maxRank)
      .sort((a, b) => a.rank - b.rank);
    setFilteredUsers(matched);
  }, [participants, minRank, maxRank]);

  useEffect(() => {
    console.log("🧪 filteredUsers:", filteredUsers);
    if (filteredUsers.length > 0) {
      const defaultItems = filteredUsers.map((user) => ({
        option: user.name,
      }));
      setRouletteItems(defaultItems);
    }
  }, [filteredUsers]);

    // 티켓 설정 로직
  const buildRouletteItems = () => {
    let items = [];
    let matchedUsers = [];

    // ✅ filteredUsers 기준으로 룰렛 구성
    filteredUsers.forEach((user) => {
      let count = 1;

      for (const range of ticketRanges) {
        if (user.rank >= range.from && user.rank <= range.to) {
          count = range.count;
          break;
        }
      }

      for (let i = 0; i < count; i++) {
        items.push({ option: user.name });
      }

      matchedUsers.push({ name: user.name, rank: user.rank, count });
    });

    setAppliedUsers(matchedUsers);

    // ➕ 추가 참여자 처리
    extraInput
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .forEach((entry) => {
        const [name, rawCount] = entry.split(":");
        const extraCount = parseInt(rawCount || "1");
        if (name?.trim() && !isNaN(extraCount) && extraCount > 0) {
          for (let i = 0; i < extraCount; i++) {
            items.push({ option: name.trim() });
          }
        }
      });

    // 🚫 당첨자 제외
    if (excludeWinners) {
      items = items.filter((item) => !winnerList.includes(item.option));
    }

    // ✅ 섞기 추가 (Fisher-Yates 알고리즘)
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    setRouletteItems(items);
    setShouldSpin(false); // 먼저 false로 초기화
    setTimeout(() => {
      setShouldSpin(true); // 짧은 딜레이 후 다시 true → 변화 감지
    }, 50);
  };

  const handleSpinComplete = (winner) => {
    setWinnerList((prev) => [...prev, winner]);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-start justify-center overflow-auto">
      <div className="bg-white p-6 rounded-lg shadow-lg text-black w-[600px] relative space-y-4 mt-30">
        <button
          className="absolute top-2 right-3 text-xl font-bold text-gray-500 hover:text-black"
          onClick={onClose}
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-2">🎯 시즌 {season} 룰렛 설정</h2>

        {/* 랭킹 범위 */}
        

        {filteredUsers.length > 0 && (
          <div className="mt-4 text-sm text-gray-100 bg-gray-800 p-4 rounded">
            <div className="flex gap-2 mb-2">
              <label>랭킹 범위:</label>
              <input 
                type="number" 
                value={minRank === '' ? 1 : minRank}  // 빈값일 때 기본값 1
                onChange={handleMinRankChange} 
                className="border px-2 w-16" 
              />
              ~
              <input 
                type="number" 
                value={maxRank === '' ? 100 : maxRank}  // 빈값일 때 기본값 100
                onChange={handleMaxRankChange} 
                className="border px-2 w-16" 
              />
            </div>

            {/* ✅ 6개씩 묶어서 줄로 표시 */}
            <div className="flex flex-wrap gap-2">
              {filteredUsers.map((user, idx) => (
                <div
                  key={idx}
                  className="px-2 py-1 bg-gray-700 text-white text-sm rounded text-left min-w-[90px] flex-1 basis-[calc(16.6%-0.5rem)] max-w-[calc(16.6%-0.5rem)]"
                >
                  {user.rank}위 {user.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 티켓 설정 */}
        <div>
          <label>🎟️ 랭킹별 추첨장 수:</label>
          {ticketRanges.map((range, idx) => (
            <div key={idx} className="flex gap-2 items-center my-1">
              <input type="number" value={range.from} onChange={(e) => {
                const newRanges = [...ticketRanges];
                newRanges[idx].from = Number(e.target.value);
                setTicketRanges(newRanges);
              }} className="border px-2 w-16" />
              ~
              <input type="number" value={range.to} onChange={(e) => {
                const newRanges = [...ticketRanges];
                newRanges[idx].to = Number(e.target.value);
                setTicketRanges(newRanges);
              }} className="border px-2 w-16" />
              장수:
              <input type="number" value={range.count} onChange={(e) => {
                const newRanges = [...ticketRanges];
                newRanges[idx].count = Number(e.target.value);
                setTicketRanges(newRanges);
              }} className="border px-2 w-16" />
              <button onClick={() => {
                const newRanges = ticketRanges.filter((_, i) => i !== idx);
                setTicketRanges(newRanges);
              }} className="text-red-600 ml-2">삭제</button>
            </div>
          ))}
          <button onClick={() => setTicketRanges([...ticketRanges, { from: 1, to: 10, count: 1 }])} className="mt-1 text-sm text-blue-600">
            + 구간 추가
          </button>
        </div>

        {/* 추가 참여자 */}
        <div>
          <label>👥 추가 참여자 (형식: 이름:개수,이름2:개수):</label>
          <textarea value={extraInput} onChange={(e) => setExtraInput(e.target.value)} className="border w-full h-12 p-2" />
        </div>

        {/* 제외 여부 */}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={excludeWinners} onChange={(e) => setExcludeWinners(e.target.checked)} />
          당첨자는 다음 추첨에서 제외
        </label>

        <div className="flex justify-end gap-4 mt-4">
          <button
            onClick={() => {
              setWinner(null);
              buildRouletteItems();
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            룰렛 돌리기
          </button>
          <button
            onClick={() => {
              if (rouletteItems.length === 0) {
                alert("돌릴 참가자가 없습니다!");
                return;
              }

              // 새 index 재계산
              const index = Math.floor(Math.random() * rouletteItems.length);
              setWinner(null);
              setShouldSpin(false);
              setSpinningKey(prev => prev + 1); // ✅ 리셋 트리거
              setTimeout(() => {
                setShouldSpin(true);
              }, 50);
            }}

            className="bg-gray-400 text-black px-4 py-2 rounded"
          >
            다시 돌리기
          </button>
        </div>

        <div className="h-[600px] flex items-center justify-center overflow-hidden -mt-20">
          <RouletteClient
            key={spinningKey}
            items={rouletteItems}
            shouldSpin={shouldSpin}
            onComplete={(name) => {
              setWinner(name); // ✅ 이것만 있어도 됩니다
              handleSpinComplete(name);
            }}
            winAudioRef={winAudioRef}
          />
        </div>
        
        {winner && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="absolute -mt-70 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col items-center bg-gradient-to-br from-yellow-400/90 to-pink-500/90 px-10 py-8 rounded-3xl shadow-2xl border-4 border-white"
          >
            <div className="text-black text-3xl font-extrabold tracking-wider mb-4 animate-pulse">🎉 당첨자!</div>

            {/* 🔥 이미지 크기를 w-20 h-20으로 확대 */}
            <div className="w-40 h-40 mb-3">
              <UserProfileImage username={winner} />
            </div>

            <div className="text-white text-4xl font-black mt-2 drop-shadow-xl tracking-wide">{winner}</div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function UserProfileImage({ username }) {
  const [imgSrc, setImgSrc] = useState(`/icons/users/웹_${username}.jpg`);

  return (
    <div className="relative w-40 h-40 overflow-hidden">
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