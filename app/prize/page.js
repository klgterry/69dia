"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

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
  
export default function PrizePage() {
  const [prizeData, setPrizeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

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
                  { name: "rule", path: "/rule" },
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
    </div>
  );
}
