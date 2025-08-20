// app/week/page.js
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

/* ===== ALL SEASONS 불러오기 ===== */
async function fetchLeaderboardForAllSeason() {
  const res = await fetch("/api/gasApi?action=getAllSeasonsRanking");
  if (!res.ok) throw new Error("Failed to fetch all-seasons ranking");
  const payload = await res.json();

  // 다양한 응답 포맷 대응 (배열 / {ok, result} / {players})
  const arr = Array.isArray(payload)
    ? payload
    : (payload && payload.ok && Array.isArray(payload.result))
    ? payload.result
    : Array.isArray(payload?.players)
    ? payload.players
    : [];

  // 정규화 + 상위 15명
  const normalized = arr.map((x) => ({
    username: x.username ?? x.PLAYER ?? x.name ?? "Unknown",
    wins: Number(x.wins ?? x.WINS ?? 0),
    rank: x.rank ?? null,
  }));

  // rank 없으면 즉석 공동순위 계산
  if (normalized.every((p) => p.rank == null)) {
    let rank = 1;
    for (let i = 0; i < normalized.length; i++) {
      if (i > 0 && normalized[i].wins === normalized[i - 1].wins) {
        normalized[i].rank = normalized[i - 1].rank;
      } else {
        normalized[i].rank = rank;
      }
      rank++;
    }
  }

  return { players: normalized.slice(0, 15) };
}

/* ===== 주간 페이지 ===== */
export default function WeekPage() {
  const router = useRouter();

  const [wins, setWins] = useState([]);
  const [streaks, setStreaks] = useState([]);
  const [duos, setDuos] = useState([]);
  const [allSeason, setAllSeason] = useState([]); // ALL SEASONS
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAll() {
      setIsLoading(true);
      try {
        const [winsRes, streaksRes, duosRes, seasonsRes] = await Promise.all([
          fetch("/api/gasApi?action=getWeeklyRanking"),
          fetch("/api/gasApi?action=getWeeklyWinStreakRanking"),
          fetch("/api/gasApi?action=getWeeklyDuoRanking"),
          fetchLeaderboardForAllSeason(),
        ]);

        const [winsData, streaksData, duosData, seasonsData] = await Promise.all([
          winsRes.json(),
          streaksRes.json(),
          duosRes.json(),
          Promise.resolve(seasonsRes), // 이미 JSON 파싱 완료 형태
        ]);

        const sortedWins = assignRanks([...winsData].sort((a, b) => b.WINS - a.WINS), "WINS");
        const sortedStreaks = assignRanks([...streaksData].sort((a, b) => b.STREAK - a.STREAK), "STREAK");
        const sortedDuos = assignRanks([...duosData].sort((a, b) => b.WINS - a.WINS), "WINS");

        setWins(sortedWins);
        setStreaks(sortedStreaks);
        setDuos(sortedDuos);
        setAllSeason(seasonsData.players || []);
      } catch (err) {
        console.error("❌ 데이터 로딩 실패:", err);
        setAllSeason([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAll();
  }, []);

  function assignRanks(data, key = "WINS") {
    let rank = 1;
    return data.map((item, index, arr) => {
      if (index > 0 && arr[index - 1][key] === item[key]) {
        item.rank = arr[index - 1].rank;
      } else {
        item.rank = rank;
      }
      rank++;
      return item;
    });
  }

  const getBadge = (rank) => {
    if (rank === 1) return "/icons/rank/1.png";
    if (rank === 2) return "/icons/rank/2.png";
    if (rank === 3) return "/icons/rank/3.png";
    return null;
  };

  const getTextClass = (rank) => {
    if (rank === 1 || rank === 2 || rank === 3) return "text-yellow-300 font-bold";
    return "text-white";
  };

  const renderUserCell = (username, rank) => {
    const trimmed = username?.trim();
    const imgSrc = trimmed ? `/icons/users/웹_${trimmed}.jpg` : "/icons/users/default.png";
    return (
      <div className="flex items-center gap-2">
        <div className="relative w-5 h-5 rounded overflow-hidden">
          <Image
            src={imgSrc}
            alt={trimmed || "player"}
            fill
            className="object-cover"
            onError={(e) => (e.currentTarget.src = "/icons/users/default.png")}
          />
        </div>
        <span className={`text-sm truncate w-[39px] text-left ${getTextClass(rank)}`}>{trimmed}</span>
      </div>
    );
  };

  const renderDuoCell = (duoString, rank) => {
    const [user1, user2] = duoString.split("&").map((u) => u.trim());
    return (
      <div className="grid grid-cols-[auto_20px_auto] items-center gap-2">
        <div className="flex items-center gap-2">
          <div className="relative w-5 h-5 rounded overflow-hidden">
            <Image
              src={`/icons/users/웹_${user1}.jpg`}
              alt={user1}
              fill
              className="object-cover"
              onError={(e) => (e.currentTarget.src = "/icons/users/default.png")}
            />
          </div>
          <span className={`text-sm truncate w-[39px] text-left ${getTextClass(rank)}`}>{user1}</span>
        </div>
        <span className="text-sm text-center">&</span>
        <div className="flex items-center gap-1">
          <div className="relative w-5 h-5 rounded overflow-hidden">
            <Image
              src={`/icons/users/웹_${user2}.jpg`}
              alt={user2}
              fill
              className="object-cover"
              onError={(e) => (e.currentTarget.src = "/icons/users/default.png")}
            />
          </div>
          <span className={`text-sm truncate w-[39px] text-left ${getTextClass(rank)}`}>{user2}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* 네비게이션 바 */}
      <nav className="flex justify-start items-center space-x-6 bg-gray-800 p-2 rounded-lg shadow-md text-lg font-bold tracking-widest pl-4">
        <div className="relative w-12 h-12">
          <Image src="/icons/logo.png" alt="Logo" fill className="object-contain" />
        </div>
        {[
          { name: "home", path: "/" },
          { name: "week", path: "/week" },
          { name: "setting", path: "/setting" },
          { name: "user", path: "/user" },
          { name: "history", path: "/history" },
          { name: "ready", path: "/ready" },
          { name: "prize", path: "/prize" },
        ].map(({ name, path }) => (
          <button
            key={name}
            onClick={() => router.push(path)}
            className="w-28 h-8 flex items-center justify-center md:w-36 md:h-10"
            style={{
              backgroundImage: `url('/icons/nav/${name}.png')`,
              backgroundSize: "contain",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundImage = `url('/icons/nav/${name}_hover.png')`)
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundImage = `url('/icons/nav/${name}.png')`)
            }
          />
        ))}
      </nav>

      {/* 두 패널 레이아웃 */}
      <div className="mt-10 mx-auto w-full max-w-[1280px] px-6">
        <div className="grid gap-10 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* ===== LEFT: Hot Players / LAST WEEK ===== */}
          <section
            className="relative min-h-[560px] p-6 bg-black/90 rounded"
            style={{
              backgroundImage: "url('/icons/bg/fire_frame.png')",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "100% 100%",
            }}
          >
            {/* 주간 테이블 */}
            {isLoading ? (
              <div className="mt-60 text-center text-gray-300">Loading…</div>
            ) : (
              <div className="mt-40 w-full overflow-x-auto">
                <table className="table-auto w-[350px] h-[400px] mx-auto text-left border-separate border-spacing-x-2">
                  <thead>
                    <tr className="text-center text-2xl">
                      <th colSpan={3}>🏆 승수</th>
                      <th colSpan={3} className="pl-5 border-l-4 border-gray-400">
                        🔥 연승
                      </th>
                      <th colSpan={3} className="border-l-4 border-gray-400">
                        👥 듀오 승
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 10 }).map((_, idx) => {
                      const win = wins[idx];
                      const streak = streaks[idx];
                      const duo = duos[idx];
                      return (
                        <tr key={idx} className="text-center">
                          {/* 승수 */}
                          <td>
                            {win && getBadge(win.rank) ? (
                              <div className="relative w-5 h-5 mx-auto">
                                <Image src={getBadge(win.rank)} alt="badge" fill className="object-contain" />
                              </div>
                            ) : (
                              win?.rank ?? ""
                            )}
                          </td>
                          <td>{win && renderUserCell(win.PLAYER, win.rank)}</td>
                          <td className={`text-left pr-6 ${win ? getTextClass(win.rank) : ""}`}>{win?.WINS ?? ""}</td>

                          {/* 연승 */}
                          <td className="pl-8 border-l-4 border-gray-400">
                            {streak && getBadge(streak.rank) ? (
                              <div className="relative w-5 h-5 mx-auto pl-8">
                                <Image src={getBadge(streak.rank)} alt="badge" fill className="object-contain" />
                              </div>
                            ) : (
                              streak?.rank ?? ""
                            )}
                          </td>
                          <td>{streak && renderUserCell(streak.PLAYER, streak.rank)}</td>
                          <td className={`text-left pr-6 ${streak ? getTextClass(streak.rank) : ""}`}>{streak?.STREAK ?? ""}</td>

                          {/* 듀오 */}
                          <td className="pl-8 border-l-4 border-gray-400">
                            {duo && getBadge(duo.rank) ? (
                              <div className="relative w-5 h-5 mx-auto pl-8">
                                <Image src={getBadge(duo.rank)} alt="badge" fill className="object-contain" />
                              </div>
                            ) : (
                              duo?.rank ?? ""
                            )}
                          </td>
                          <td>{duo && renderDuoCell(duo.DUO, duo.rank)}</td>
                          <td className={`text-left ${duo ? getTextClass(duo.rank) : ""}`}>{duo?.WINS ?? ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ===== RIGHT: ALL SEASONS ===== */}
            <aside
            className="relative min-h-[560px] p-6 bg-black/90 rounded"
            style={{
                backgroundImage: "url('/icons/bg/all_season.png')",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: "100% 100%",
            }}
            >
            {/* 1-15위 / 닉네임 / 통산승수 */}
            {isLoading ? (
                <div className="mt-60 text-center text-gray-300">Loading…</div>
            ) : (
                <div className="mt-15 overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="uppercase text-gray-300">
                    <tr>
                        <th className="py-2 text-center w-14">순위</th>
                        <th className="py-2 text-center">닉네임</th>
                        <th className="py-2 text-center w-24 pr-1">통산승수</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                    {allSeason.map((p, i) => (
                        <tr key={i} className="hover:bg-white/5">
                        <td className="py-2 text-center">
                            {p.rank <= 3 ? (
                            <div className="relative w-5 h-5 mx-auto">
                                <Image src={getBadge(p.rank)} alt="badge" fill className="object-contain" />
                            </div>
                            ) : (
                            <span>{p.rank}</span>
                            )}
                        </td>
                        <td className="py-2">
                            <div className="flex items-center gap-2 pl-12">
                            <div className="relative w-5 h-5 rounded overflow-hidden">
                                <Image
                                src={`/icons/users/웹_${(p.username || "Unknown").trim()}.jpg`}
                                alt={p.username || "Unknown"}
                                fill
                                className="object-cover"
                                onError={(e) => (e.currentTarget.src = "/icons/users/default.png")}
                                />
                            </div>
                            <span className={`truncate ${getTextClass(p.rank)}`}>{p.username || "Unknown"}</span>
                            </div>
                        </td>
                        <td className={`py-2 text-right pr-10 ${getTextClass(p.rank)}`}>{p.wins}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            )}
            </aside>

        </div>
      </div>
    </div>
  );
}
