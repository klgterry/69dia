"use client";

// user / user-popup 페이지가 공유하는 유저 상세 카드.
// 데이터는 useUserProfile 훅에서 받아 props로 전달받는다.

import Image from "next/image";
import {
  UserSeasonStats,
  UserDuoStats,
  UserRecentGames,
  UserAwards,
  UserStatsExtra,
} from "@/components/user/profileSections";

export default function UserProfilePanel({
  selectedUser,
  seasonList,
  selectedSeason,
  setSelectedSeason,
  isSeasonStatsLoading,
  duoStats,
  recentGames,
  userSummaryData,
  userBestRank,
  seasonStats,
  recentGamesRendered,
  awardsRendered,
  allGames,
  playerScoresMap,
}) {
  if (!selectedUser) {
    return (
      <p className="text-center mt-10 text-sm text-gray-400">
        ※ 사이트 최적화 중입니다.
      </p>
    );
  }

  return (
    <div
      className="bg-center bg-no-repeat bg-contain p-6 rounded-lg max-w-1xl mx-auto -mt-10 relative"
      style={{
        width: "824px",
        height: "768px",
        backgroundImage: "url('/icons/bg/player_bg.png')",
        backgroundSize: "contain",
        padding: "2rem",
      }}
    >
      <div className="absolute top-10 right-10">
        {seasonList.length > 0 && selectedSeason && (
          <select
            className="bg-gray-800 text-white p-2 rounded ml-7"
            value={selectedSeason?.TITLE || ""}
            onChange={(e) => {
              const season = seasonList.find((s) => s.TITLE === e.target.value);
              setSelectedSeason(season);
            }}
          >
            {seasonList.map((season) => (
              <option key={season.TITLE} value={season.TITLE}>
                {season.TITLE}
              </option>
            ))}
          </select>
        )}

        {/* 🎖 시즌 BEST 배너 - 항상 표시 */}
        <div className="relative w-[150px] h-[240px]">
          <Image
            src="/icons/etc/시즌베스트.png"
            alt="All Season Best"
            fill
            className="object-contain"
          />
        </div>
        {/* 🥇 최고 랭크 출력 텍스트 */}
        {userBestRank !== null && (
          <div className="absolute top-4/9 w-[150px] text-center text-white text-6xl drop-shadow-[0_0_4px_rgba(255,0,0,1)]">
            {userBestRank}위
          </div>
        )}
      </div>

      <div className="flex p-8 items-start">
        <div className="flex flex-col items-center space-y-2 w-[200px]">
          <div className="relative w-[250px] h-[250px] rounded overflow-hidden border border-gray-500">
            <Image
              src={`/icons/users/웹_${selectedUser}.jpg`}
              alt={selectedUser}
              fill
              className="object-contain"
              onError={(e) => (e.currentTarget.src = "/icons/users/default.png")}
            />
          </div>
          <h2 className="text-4xl font-bold text-white mb-1">{selectedUser}</h2>
        </div>

        {isSeasonStatsLoading ? (
          <div className="ml-12 text-lg text-gray-400 flex items-center">⏳ 시즌 데이터를 불러오는 중입니다...</div>
        ) : (
          <UserSeasonStats
            username={selectedUser}
            seasonStats={seasonStats}
            isLoading={isSeasonStatsLoading}
            season={selectedSeason?.TITLE || "ALL"}
            seasonList={seasonList}
            playerScores={playerScoresMap.get(selectedUser) || null}
            summaryData={userSummaryData}
          />
        )}
      </div>

      {/* 🔴 아래쪽 전체 콘텐츠도 조건부 */}
      {(isSeasonStatsLoading || !duoStats) && !(recentGamesRendered || awardsRendered) ? (
        <div className="text-center mt-10 text-lg text-gray-400">⏳ 데이터를 불러오는 중입니다...</div>
      ) : (
        <>
          {/* 시즌 기반 데이터: 듀오 통계 */}
          {!isSeasonStatsLoading && duoStats && (
            <div className="flex justify-between items-start gap-4 border-t border-gray-600 -mt-8">
              {/* 왼쪽: DUO */}
              <div className="flex-1">
                <UserDuoStats
                  duoStats={duoStats}
                  selectedUser={selectedUser}
                  seasonTitle={selectedSeason?.TITLE || "ALL"}
                />
              </div>

              {/* 오른쪽: 최다연승 */}
              <div className="ml-0 -translate-x-35">
                <UserStatsExtra
                  recentGames={allGames}
                  summaryData={userSummaryData}
                  selectedUser={selectedUser}
                  selectedSeason={selectedSeason}
                />
              </div>
            </div>
          )}
          <div className="w-full h-[1px] bg-gray-600 my-3" />
          {/* 고정 출력: recentGames & awards */}
          <div className="flex flex-row gap-6 items-start justify-start mt-4 min-h-[200px]">
            {/* 왼쪽: RecentGames */}
            <div className="w-[280px]">
              {recentGamesRendered ? (
                <UserRecentGames recentGames={recentGames} />
              ) : (
                <div className="text-gray-500 text-sm h-[150px] flex items-center justify-center">
                  ⏳ 최근 경기 불러오는 중...
                </div>
              )}
            </div>

            {/* 오른쪽: Awards */}
            <div className="flex-1 min-w-[250px]">
              {awardsRendered ? (
                <UserAwards
                  seasonStats={userSummaryData}
                  selectedUser={selectedUser}
                  seasonList={seasonList}
                />
              ) : (
                <div className="text-gray-500 text-sm h-[150px] flex items-center justify-center">
                  ⏳ Awards 불러오는 중...
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
