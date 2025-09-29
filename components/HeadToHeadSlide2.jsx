"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { RotateCcw } from "lucide-react";

/********************
 * DEBUG UTILITIES  *
 ********************/
const DBG = true; // 🔧 turn off to silence logs
const dlog = (...args) => DBG && console.log("[H2H]", ...args);
const dwarn = (...args) => DBG && console.warn("[H2H:WARN]", ...args);
const dgroup = (label, fn) => {
  if (!DBG) return fn?.();
  console.groupCollapsed("[H2H]", label);
  try { fn?.(); } finally { console.groupEnd(); }
};

/* -------------------- 작은 아이콘 컴포넌트 -------------------- */
function ClassIcon({ src, alt, size = 24 }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="object-contain shrink-0"
      draggable={false}
    />
  );
}

/* -------------------- API -------------------- */
async function fetchH2H({ playerA = "", playerB = "", season = "ALL", limit = 0 }) {
  const qs = new URLSearchParams({
    action: "getHeadToHead",
    playerA,
    playerB,
    season,
    limit: String(limit),
  });
  const url = `/api/gasApi?${qs.toString()}`;
  dlog("[fetchH2H] GET", url);
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("Failed to fetch HeadToHead");
  const json = await r.json();
  dgroup("fetchH2H result", () => {
    dlog("rows:", Array.isArray(json) ? json.length : 0);
    if (Array.isArray(json) && json.length) {
      console.table(json.slice(0, 5));
      const keys = Object.keys(json[0] || {});
      dlog("columns:", keys);
    }
  });
  return json;
}

// 클래스별 H2H
async function fetchH2HClass({ playerA = "", playerB = "", season = "ALL", limit = 0 }) {
  const qs = new URLSearchParams({
    action: "getHeadToHeadClass",
    playerA,
    playerB,
    season,
    limit: String(limit),
  });
  const url = `/api/gasApi?${qs.toString()}`;
  dlog("[fetchH2HClass] GET", url);
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error("Failed to fetch HeadToHeadClass");
  const json = await r.json();
  dgroup("fetchH2HClass result", () => {
    dlog("rows:", Array.isArray(json) ? json.length : 0);
    if (Array.isArray(json) && json.length) {
      console.table(json.slice(0, 5));
      const keys = Object.keys(json[0] || {});
      dlog("columns:", keys);
    }
  });
  return json;
}

/* -------------------- Utils -------------------- */
// 시즌 목록(등장 순서 유지, 마지막이 최신)
function uniqueSeasonsInOrder(rows) {
  const seen = new Set();
  const list = [];
  for (const r of rows || []) {
    const s = r?.SEASON;
    if (s && !seen.has(s)) {
      seen.add(s);
      list.push(s);
    }
  }
  dlog("[uniqueSeasonsInOrder]", list);
  return list;
}

// 전체 승/패 집계 (디버깅 포함)
function computeAgg(rows) {
  const isArr = Array.isArray(rows);
  dgroup("computeAgg()", () => {
    dlog("input rows:", isArr ? rows.length : 0);
    if (isArr) console.table(rows.slice(0, 10));
  });

  if (!isArr || rows.length === 0) {
    return { aWins: 0, bWins: 0, total: 0, aRate: 0, bRate: 0 };
  }
  const toNum = (v) => {
    const n = Number(String(v ?? "").toString().trim());
    if (!Number.isFinite(n)) {
      dwarn("Non-numeric value in computeAgg:", v);
      return 0;
    }
    return n;
  };
  const aWins = rows.reduce((s, r) => s + toNum(r.A_WINS), 0);
  const bWins = rows.reduce((s, r) => s + toNum(r.B_WINS), 0);
  const total = aWins + bWins;
  const aRate = total ? (aWins / total) * 100 : 0;
  const bRate = total ? 100 - aRate : 0;

  dgroup("computeAgg() → result", () => {
    dlog({ aWins, bWins, total, aRate: Number(aRate.toFixed?.(3) ?? aRate), bRate: Number(bRate.toFixed?.(3) ?? bRate) });
  });

  return { aWins, bWins, total, aRate, bRate };
}

/* -------------------- 클래스 매트릭스용 -------------------- */
const CLASS_ORDER = ["드", "어", "넥", "슴"];
const CLASS_ICON = {
  드: "/icons/classes/druid.jpg",
  어: "/icons/classes/oracle.jpg",
  넥: "/icons/classes/necro.jpg",
  슴: "/icons/classes/summoner.jpg",
};

// 좌우 스왑 보정(A/B 역방향 대응, season 컬럼 없으면 통과)
function normalizeClassRows(rows, season, A, B) {
  const arr = Array.isArray(rows) ? rows : [];
  const out = [];
  const A1 = (A ?? "").trim();
  const B1 = (B ?? "").trim();

  let swapCount = 0;
  let passCount = 0;

  for (const r of arr) {
    const seasonOk = season === "ALL" ? true : (r.SEASON ? r.SEASON === season : true);
    if (!seasonOk) continue;

    const aName = (r.A ?? "").trim();
    const bName = (r.B ?? "").trim();

    if (!("A_CLASS" in r) || !("B_CLASS" in r)) {
      dwarn("[normalizeClassRows] Missing A_CLASS/B_CLASS keys:", Object.keys(r));
    }

    if (aName === A1 && bName === B1) {
      out.push(r);
      passCount++;
    } else if (aName === B1 && bName === A1) {
      // 스왑
      out.push({
        ...r,
        A: A1,
        B: B1,
        A_CLASS: r.B_CLASS,
        B_CLASS: r.A_CLASS,
        A_WINS: r.B_WINS,
        B_WINS: r.A_WINS,
      });
      swapCount++;
    }
  }
  dgroup("normalizeClassRows()", () => {
    dlog("input:", arr.length, "→ output:", out.length, "(pass:", passCount, ", swap:", swapCount, ")");
    if (out.length) console.table(out.slice(0, 8));
  });
  return out;
}

// A의 각 클래스 × B의 각 클래스 승률/총판수 계산 + 디버깅 요약
function buildClassMatrix(rows) {
  const matrix = {};
  const counts = {}; // 요약 카운트: {"드-어": {total, aWins, bWins}}

  CLASS_ORDER.forEach((aC) => {
    matrix[aC] = {};
    CLASS_ORDER.forEach((bC) => {
      const subset = (rows || []).filter((r) => r.A_CLASS === aC && r.B_CLASS === bC);
      const aWins = subset.reduce((s, r) => s + (Number(r.A_WINS) || 0), 0);
      const bWins = subset.reduce((s, r) => s + (Number(r.B_WINS) || 0), 0);
      const total = aWins + bWins;
      const aRate = total ? (aWins / total) * 100 : null; // null이면 데이터 없음
      const bRate = total ? 100 - aRate : null;
      matrix[aC][bC] = { total, aRate, bRate };

      const key = `${aC}-${bC}`;
      counts[key] = { rows: subset.length, aWins, bWins, total, aRate: aRate?.toFixed?.(1) ?? null };
    });
  });

  dgroup("buildClassMatrix() summary", () => {
    const flat = Object.entries(counts).map(([k, v]) => ({ pair: k, ...v }));
    // non-zero 또는 데이터 존재하는 셀만 출력
    const interesting = flat.filter((x) => (x.total ?? 0) > 0 || (x.rows ?? 0) > 0);
    if (interesting.length) console.table(interesting);
    else dlog("no class data");
  });

  return matrix;
}

/* -------------------- Component -------------------- */
export default function HeadToHeadSlide2({
  width = 900,
  height = 1000,
  bgSrc = "/icons/bg/h2h_bg.png",
  slotTopPct = 27,
  slotLeftPct = 28, // A
  slotRightPct = 72, // B
}) {
  // 전역 시즌
  const [seasonList, setSeasonList] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState("");

  // 시즌 기반 유저 리스트
  const [userList, setUserList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // 선택 상태
  const [selectedUserA, setSelectedUserA] = useState("");
  const [selectedUserB, setSelectedUserB] = useState("");

  // 페어 데이터/로딩
  const [pairRows, setPairRows] = useState(null);
  const [loadingPair, setLoadingPair] = useState(false);

  // 클래스별 원본
  const [classRows, setClassRows] = useState(null);

  // 위치 좌표
  const slotTop = `${slotTopPct}%`;
  const aLeft = `${slotLeftPct}%`;
  const bLeft = `${slotRightPct}%`;

  /* 1) 시즌 목록 선로드 + 최신 시즌 디폴트 */
  useEffect(() => {
    fetchH2H({ season: "ALL" })
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        const seasons = uniqueSeasonsInOrder(arr);
        setSeasonList(["ALL", ...seasons]); // ← ALL 추가
        const last = seasons.length ? seasons[seasons.length - 1] : "";
        setSelectedSeason(last);
        dgroup("init seasons", () => {
          dlog("seasons:", seasons);
          dlog("default season:", last);
        });
      })
      .catch((e) => {
        console.error(e);
        setSeasonList([]);
        setSelectedSeason("");
      });
  }, []);

  /* 2) 시즌 바뀌면 그 시즌의 유저 리스트 구성 (A/B 및 페어 결과 초기화) */
  useEffect(() => {
    if (!selectedSeason) {
      setUserList([]);
      setLoadingUsers(false);
      return;
    }
    dlog("[season change]", selectedSeason);
    setLoadingUsers(true);
    fetchH2H({ season: selectedSeason })
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        const users = Array.from(new Set(arr.flatMap((r) => [r.A, r.B]).filter(Boolean))).sort((a, b) =>
          a.localeCompare(b, "ko")
        );
        setUserList(users);
        setSelectedUserA("");
        setSelectedUserB("");
        setPairRows(null);
        setClassRows(null);
        dgroup("season→users", () => {
          dlog("season:", selectedSeason, "users:", users.length);
          console.table(users.slice(0, 30).map((u) => ({ user: u })));
        });
      })
      .catch((e) => {
        console.error(e);
        setUserList([]);
        setSelectedUserA("");
        setSelectedUserB("");
        setPairRows(null);
        setClassRows(null);
      })
      .finally(() => setLoadingUsers(false));
  }, [selectedSeason]);

  /* 3) A 선택 시 B 후보 리스트 */
  const availableUsers = useMemo(() => {
    if (!selectedUserA) return [];
    const list = userList.filter((u) => u !== selectedUserA);
    dlog("availableUsers for", selectedUserA, "=", list.length);
    return list;
  }, [userList, selectedUserA]);

  /* 4) B 선택 시: 페어 + 클래스 병렬 조회 */
  useEffect(() => {
    if (!selectedSeason || !selectedUserA || !selectedUserB) {
      setPairRows(null);
      setClassRows(null);
      return;
    }
    let alive = true;
    setLoadingPair(true);
    dlog("[fetch pair+class]", { season: selectedSeason, A: selectedUserA, B: selectedUserB });

    Promise.all([
      fetchH2H({ playerA: selectedUserA, playerB: selectedUserB, season: selectedSeason }),
      fetchH2HClass({ playerA: selectedUserA, playerB: selectedUserB, season: selectedSeason }),
    ])
      .then(([pairData, classData]) => {
        if (!alive) return;

        // 페어 보정
        const arr = Array.isArray(pairData) ? pairData : [];
        const filtered =
          selectedSeason === "ALL"
            ? arr.filter((r) => r.A === selectedUserA && r.B === selectedUserB)
            : arr.filter((r) => r.SEASON === selectedSeason && r.A === selectedUserA && r.B === selectedUserB);
        dgroup("pairRows filtered", () => {
          dlog("count:", filtered.length);
          console.table(filtered);
        });
        setPairRows(filtered);

        // 클래스 데이터 보정 + 로그
        dgroup("classData RAW", () => {
          if (Array.isArray(classData) && classData.length) {
            console.table(classData.slice(0, 10));
            dlog("keys:", Object.keys(classData[0] || {}));
          } else {
            dlog("no classData");
          }
        });
        const normalized = normalizeClassRows(classData, selectedSeason, selectedUserA, selectedUserB);
        dlog("classRows normalized count:", normalized.length);
        setClassRows(normalized);
      })
      .catch((err) => {
        console.error("[pair/class fetch error]", err);
        setPairRows([]);
        setClassRows([]);
      })
      .finally(() => alive && setLoadingPair(false));

    return () => {
      alive = false;
    };
  }, [selectedSeason, selectedUserA, selectedUserB]);

  /* 5) 핸들러 */
  const handleReset = () => {
    dlog("[reset]");
    setSelectedUserA("");
    setSelectedUserB("");
    setPairRows(null);
    setClassRows(null);
  };

  /* 6) 메모 집계 */
  const hasPairData = Array.isArray(pairRows) && pairRows.length > 0;
  const { aRate, bRate } = useMemo(() => {
    const agg = computeAgg(pairRows || []);
    dlog("agg rates", { aRate: agg.aRate, bRate: agg.bRate });
    return agg;
  }, [pairRows]);

  const hasClassData = Array.isArray(classRows) && classRows.length > 0;
  const classMatrix = useMemo(() => {
    const m = buildClassMatrix(classRows || []);
    // 셀 몇 개 샘플 출력
    dgroup("classMatrix sample", () => {
      const sample = [];
      for (const aC of CLASS_ORDER) {
        for (const bC of CLASS_ORDER) {
          const cell = m?.[aC]?.[bC];
          if (cell && (cell.total ?? 0) > 0) sample.push({ aC, bC, ...cell });
          if (sample.length >= 8) break;
        }
        if (sample.length >= 8) break;
      }
      if (sample.length) console.table(sample);
      else dlog("no non-zero cells");
    });
    return m;
  }, [classRows]);

  /* -------------------- Render -------------------- */
  return (
    <div className="relative mx-auto -mt-10" style={{ width, height }}>
      {/* 배경 */}
     <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        <div className="relative h-full w-[100%] min-w-[900px] left-1/2 -translate-x-1/2">
          <Image
            src={bgSrc}
            alt="H2H Background"
            fill
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* 이름 슬롯 - A */}
      <div
        className="absolute font-bold text-white tracking-wide z-10 pl-50 -mt-16"
        style={{ top: `${slotTopPct}%`, left: `${slotLeftPct}%`, transform: "translate(-50%, -50%)" }}
      >
        <span className="px-3 py-1 text-3xl drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{selectedUserA || "?"}</span>
      </div>

      {/* 이름 슬롯 - B */}
      <div
        className="absolute font-bold text-white tracking-wide z-10 pr-30 -mt-16"
        style={{ top: `${slotTopPct}%`, left: `${slotRightPct}%`, transform: "translate(-50%, -50%)" }}
      >
        <span className="px-3 py-1 text-3xl drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{selectedUserB || "?"}</span>
      </div>

      {/* 전체 초기화 버튼 */}
      <div className="absolute z-10  -mt-16" style={{ top: `${slotTopPct}%`, right: "30px", transform: "translateY(-50%)" }}>
        <button onClick={handleReset} className="text-white hover:text-red-400 transition pr-40" title="전체 초기화">
          <RotateCcw size={28} />
        </button>
      </div>

      {/* 본문 */}
      <div className="absolute inset-0 z-10 p-6 flex flex-col mt-45 pl-12">
        {/* 시즌 드롭다운 */}
        <div className="mb-2 flex items-center justify-end">
          <select
            value={selectedSeason}
            onChange={(e) => setSelectedSeason(e.target.value)}
            className="bg-gray-700 p-2 rounded disabled:opacity-50"
            disabled={!seasonList.length}
          >
            {seasonList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* 선택 영역 */}
        <div className="flex flex-col gap-4">
          {loadingUsers ? (
            <div className="text-center text-neutral-300 py-6">Loading users…</div>
          ) : (
            <div className="flex flex-wrap justify-center gap-3 max-w-[800px]">
              {!selectedUserA
                ? userList.map((u) => (
                    <button
                      key={u}
                      onClick={() => {
                        dlog("select A:", u);
                        setSelectedUserA(u);
                        setSelectedUserB("");
                        setPairRows(null);
                        setClassRows(null);
                      }}
                      className="px-4 py-2 rounded text-sm bg-gray-700 hover:bg-gray-600"
                    >
                      {u}
                    </button>
                  ))
                : availableUsers.map((u) => (
                    <button
                      key={u}
                      onClick={() => {
                        dlog("select B:", u);
                        // 즉시 로딩 전환 & 기존 결과 비우기
                        setLoadingPair(true);
                        setPairRows(null);
                        setClassRows(null);
                        setSelectedUserB(u);
                      }}
                      className={`px-4 py-2 rounded text-sm ${
                        selectedUserB === u
                          ? "bg-green-600"
                          : "bg-gray-700 hover:bg-gray-600"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
            </div>
          )}
        </div>

        {/* 결과 섹션: A/B만 선택되면 항상 렌더 */}
        {selectedUserA && selectedUserB && (
          <div className="relative mt-6 w-full max-w-[1100px] mx-auto">
            {/* 로딩 오버레이: 결과 섹션 전체를 덮어씀 */}
            {loadingPair && (
              <div className="absolute inset-0 z-20 flex items-center justify-center
                              bg-black/60 backdrop-blur-[1px]">
                <div className="px-4 py-2 rounded bg-gray-800 text-white font-semibold">
                  Loading…
                </div>
              </div>
            )}
            <div className="mb-2 text-2xl text-center">
              <span className="text-yellow-300 font-semibold">{selectedUserA}</span>
              <span className="text-neutral-200"> vs </span>
              <span className="text-yellow-300 font-semibold">{selectedUserB}</span>
              <span className="text-neutral-200"> 의 상대 전적(%)</span>
            </div>

            <div className="relative w-full max-w-[700px] h-12 mx-auto pr-5">
              {/* 바깥 이름 */}
              <div className="absolute -left-20 top-1/2 -translate-y-1/2 text-white font-bold whitespace-nowrap">
                <span className="inline-block w-4 h-4 bg-red-600 rounded-sm" />
                {selectedUserA}
              </div>
              <div className="absolute -right-10 top-1/2 -translate-y-1/2 text-white font-bold whitespace-nowrap text-right">
                {selectedUserB}
                <span className="inline-block w-4 h-4 bg-blue-600 rounded-sm" />
              </div>

              {/* 승률바 */}
              {aRate === 0 && bRate === 0 ? (
                <div className="text-center text-neutral-300 py-3">- No Data -</div>
              ) : (
                <div className="relative w-full h-full bg-gray-800 rounded overflow-hidden">
                  {/* A(빨강) */}
                  <div className="h-full bg-red-600" style={{ width: `${Math.min(100, Math.max(0, aRate))}%` }} />
                  {/* B(파랑) */}
                  <div className="absolute top-0 right-0 h-full bg-blue-600" style={{ width: `${Math.min(100, Math.max(0, bRate))}%` }} />
                  {/* 퍼센트 */}
                  <div className="absolute inset-0 text-white text-sm font-bold">
                    <div className="absolute top-0 left-0 h-full flex items-center justify-center pointer-events-none" style={{ width: `${Math.min(100, Math.max(0, aRate))}%` }}>
                      <span>{aRate.toFixed(1)}%</span>
                    </div>
                    <div className="absolute top-0 right-0 h-full flex items-center justify-center pointer-events-none" style={{ width: `${Math.min(100, Math.max(0, bRate))}%` }}>
                      <span>{bRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ----- 클래스 매트릭스 섹션 ----- */}
            <div className="mt-10 w-full max-w-[1100px] mx-auto">
              <div className="mb-3 text-2xl text-center">
                <span className="text-yellow-300 font-semibold">{selectedUserA}</span>
                <span className="text-neutral-200"> vs </span>
                <span className="text-yellow-300 font-semibold">{selectedUserB}</span>
                <span className="text-neutral-200"> 의 클래스별 상대 전적(%)</span>
              </div>

              {!hasClassData && <div className="text-sm text-neutral-300 text-center">- No Data (By Class) -</div>}

              {hasClassData && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {CLASS_ORDER.map((aC) => (
                    <div key={aC} className="flex flex-col items-stretch gap-2">
                      {/* 좌측 A 클래스 아이콘 + VS */}
                      <div className="flex items-center gap-2 mb-1">
                        <ClassIcon src={CLASS_ICON[aC]} alt={aC} size={28} />
                        <span className="text-neutral-200 text-sm">VS</span>
                      </div>

                      {/* B 클래스 4줄 */}
                      {CLASS_ORDER.map((bC) => {
                        const cell = classMatrix?.[aC]?.[bC] || { total: 0, aRate: null, bRate: null };
                        const aPct = cell.aRate ?? 0;
                        const bPct = cell.bRate ?? 0;
                        const noData = cell.aRate === null;

                        return (
                          <div key={`${aC}-${bC}`} className="flex items-center gap-2">
                            {/* B 아이콘 */}
                            <ClassIcon src={CLASS_ICON[bC]} alt={bC} size={24} />

                            {/* 승률바 */}
                            <div className="relative flex-1 h-6 bg-gray-800 rounded overflow-hidden">
                              {/* A(빨강) */}
                              <div className={`h-full ${noData ? "bg-gray-700" : "bg-red-600"}`} style={{ width: `${Math.min(100, Math.max(0, aPct))}%` }} />
                              {/* B(파랑) */}
                              <div className={`absolute top-0 right-0 h-full ${noData ? "bg-gray-700" : "bg-blue-600"}`} style={{ width: `${Math.min(100, Math.max(0, bPct))}%` }} />
                              {/* 텍스트 */}
                              <div className="absolute inset-0 flex justify-between items-center px-2 text-[11px] font-bold text-white">
                                <span>{noData ? "-" : `${aPct.toFixed(1)}%`}</span>
                                <span>{noData ? "-" : `${bPct.toFixed(1)}%`}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* ----- /클래스 매트릭스 섹션 ----- */}
          </div>
        )}
      </div>
    </div>
  );
}
