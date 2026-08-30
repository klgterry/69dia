"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import UserFullHistory from "@/components/UserFullHistory";
import UserStatsSection from "@/components/UserStatsSection";
import { gasGet } from "@/lib/gasClient";
import { useUserProfile } from "@/components/user/useUserProfile";
import UserProfilePanel from "@/components/user/UserProfilePanel";

async function fetchUserList() {
  return gasGet("getFilteredUsers");
}

export default function UserPage() {
  const router = useRouter();
  const [userList, setUserList] = useState([]);
  const [isUserListLoading, setIsUserListLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);

  const profile = useUserProfile(selectedUser);
  const { seasonList, setSelectedSeason } = profile;

  useEffect(() => {
    setIsUserListLoading(true);
    fetchUserList()
      .then((data) => {
        if (data.users) setUserList(data.users);
      })
      .catch((err) => console.error("유저 목록 불러오기 실패:", err))
      .finally(() => setIsUserListLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* 네비게이션 바 */}
      <nav className="flex justify-start items-center space-x-6 bg-gray-800 p-2 rounded-lg shadow-md text-lg font-bold tracking-widest pl-4">
        <div className="relative w-12 h-12">
          <Image src="/icons/logo.png" alt="Logo" fill className="object-contain" />
        </div>
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

      {/* 유저 선택 버튼 */}
      <div className="overflow-x-auto whitespace-nowrap my-6 mx-auto">
      <p className="text-center mt-10 text-sm text-gray-400">
        ※ Total 5 게임 이상부터 조회 가능합니다.
        <span className="mx-2 text-gray-600">|</span>
        <span className="text-white">👆 유저를 선택해주세요.</span>
      </p>
        {isUserListLoading ? (
          <p className="text-gray-400 text-sm text-center">🚀데이터를 불러오는 중입니다...</p>
        ) : (
          <div className="relative w-[824px] h-[220px] mx-auto my-6 rounded-lg p-4 bg-[#353f54]">

            <div className="flex flex-wrap justify-left gap-1 w-full h-full items-center">
            {userList.map((user) => (
            <button
              key={user}
              onClick={() => {
                setSelectedUser(user);
                const all = seasonList.find((s) => s.TITLE === "ALL");
                if (all) setSelectedSeason(all);
              }}
              className="px-3 py-1 text-white border border-white rounded-full shadow-md hover:bg-white hover:text-gray-900 transition-all duration-200 text-sm"
            >
              {user}
            </button>
          ))}

            </div>
          </div>
        )}
      </div>

      {/* 유저 상세 카드 */}
      <UserProfilePanel {...profile} selectedUser={selectedUser} />

      {selectedUser && (
        <div className="mt-8">
          <UserFullHistory selectedUser={selectedUser} />
          <UserStatsSection selectedUser={selectedUser} />
        </div>
      )}
    </div>
  );
}
