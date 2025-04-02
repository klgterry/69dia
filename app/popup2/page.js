"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function Popup2() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const hide = localStorage.getItem("hidePopup2");
    if (hide === "true") {
      window.close(); // 바로 닫기
    }
  }, []);

  const handleClose = () => {
    window.close();
  };

  const handleDontShowAgain = () => {
    localStorage.setItem("hidePopup2", "true");
    window.close();
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-black">
        {/* 이미지 영역 */}
        <div className="flex-1 relative overflow-hidden">
            <img
            src="/icons/popup_notice2.png"
            alt="공지"
            className="w-full h-full object-cover"
            />
        </div>

        {/* 버튼 영역: 높이 고정 + 여백 최소화 */}
        <div className="bg-gray-900 h-16 px-4 flex items-center justify-end space-x-3">
            <button
                onClick={handleClose}
                className="bg-white text-black px-4 py-2 rounded"
            >
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
