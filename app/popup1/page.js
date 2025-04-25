"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

// ✅ 유저 프로필 이미지 컴포넌트
function UserProfileImage({ username, className, style }) {
  const [imgSrc, setImgSrc] = useState(`/icons/users/웹_${username}.jpg`);

  return (
    <div className={`absolute w-[125px] h-[125px] ${className}`} style={style}>
      <Image 
        src={imgSrc}
        alt={username}
        fill
        className="object-contain"
        onError={() => setImgSrc("/icons/users/default.png")}
      />
    </div>
  );
}

export default function Popup1() {
  const [awardData, setAwardData] = useState(null);

  useEffect(() => {
    const hide = localStorage.getItem("hidePopup1");
    if (hide === "true") {
      window.close();
      return;
    }

    fetch("/api/gasApi?action=getAwardData")
      .then((res) => res.json())
      .then((data) => {
        console.log("🏆 받아온 시상 데이터:", data);
        setAwardData(data);
      })
      .catch((err) => console.error("❌ 시상 데이터 불러오기 실패:", err));
  }, []);

  const handleClose = () => window.close();
  const handleDontShowAgain = () => {
    localStorage.setItem("hidePopup1", "true");
    window.close();
  };

  if (!awardData || !awardData.top3 || !awardData.classKings) return null;

  // 좌표 설정: 1등, 2등, 3등
  // 기존 좌표에서 Y 위치만 조정 (프사는 약 40px 내려오고, 이름도 같이)
  const positions = [
    { img: [132, 193], name: [100, 193] },  // 1등
    { img: [190, 50], name: [158, 50] },    // 2등
    { img: [200, 335], name: [167, 335] }   // 3등
  ];

  return (
    <div className="flex flex-col w-screen h-screen bg-black">
      <div className="relative w-[509px] h-[800px] mx-auto">

        {/* 🖼 배경 이미지 */}
        <Image
          src="/icons/popup_notice.png"
          alt="공지"
          fill
          className="absolute object-cover"
        />

        {/* 🏆 시즌 타이틀 */}
        <div className="absolute top-[20px] left-1/2 transform -translate-x-1/2 text-white text-2xl font-extrabold tracking-wide drop-shadow">
          {awardData.season} TOP3
        </div>

        {/* 🥇🥈🥉 TOP3 순위 */}
        {awardData.top3.map((user, index) => (
          <div key={index}>
            <UserProfileImage
              username={user.name}
              style={{
                top: `${positions[index].img[0]}px`,
                left: `${positions[index].img[1]}px`
              }}
            />
            <div
              className="absolute text-white text-1xl font-bold bg-black/70 rounded px-2 py-1 text-center drop-shadow"
              style={{
                top: `${positions[index].name[0]}px`,
                left: `${positions[index].name[1]}px`,
                width: "125px"
              }}
            >
              <span className="whitespace-nowrap">
                {user.name} ({user.wins}승)
              </span>
            </div>
          </div>
        ))}

        {/* 👑 클래스별 다승왕 */}
        <div className="absolute bottom-[40px] w-full text-center text-white text-base font-semibold leading-[1.9]">
        <div className="text-2xl font-bold mb-1">클래스별 다승왕</div>
          {awardData.classKings.map((king, index) => (
            <div key={index}>
              {king.class} – {king.name} ({king.wins}승)
            </div>
          ))}
        </div>

      </div>

      {/* 버튼 영역 */}
      <div className="bg-gray-900 h-16 px-4 flex items-center justify-end space-x-3">
        <button onClick={handleClose} className="bg-white text-black px-4 py-2 rounded">
          닫기
        </button>
        <button
          onClick={handleDontShowAgain}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          다시 보지 않기
        </button>
      </div>
    </div>
  );
}
