"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function Popup2() {
  const [isVisible, setIsVisible] = useState(true);

  const LOCALSTORAGE_KEY = "hidePopup2_v2"; // 👉 새 키로 변경

  useEffect(() => {
    const hideUntil = localStorage.getItem(LOCALSTORAGE_KEY);

    if (hideUntil) {
      const now = Date.now();
      if (now < parseInt(hideUntil, 10)) {
        window.close(); // 만료되지 않았으면 바로 닫기
        return;
      } else {
        localStorage.removeItem(LOCALSTORAGE_KEY); // 만료됐으면 삭제
      }
    }
  }, []);

  const handleClose = () => {
    window.close();
  };

  const handleDontShowAgain = () => {
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 15); // 15일 후
    localStorage.setItem(LOCALSTORAGE_KEY, expireDate.getTime().toString());
    window.close();
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-black">
        {/* 이미지 영역 */}
        <div className="flex-1 relative overflow-hidden bg-black">
            <img
                src="/icons/popup_notice2.png"
                alt="공지"
                className="w-full h-full object-contain"
            />
        </div>

        {/* 버튼 영역 */}
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
                15일간 다시 보지 않기
            </button>
        </div>
    </div>
  );
}
