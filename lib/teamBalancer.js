// 팀 생성 도우미의 순수 로직.
// UI(app/ready/page.js)에서 분리하여 단위 테스트가 가능하도록 함.
// - alert() 등 부수효과는 제거하고 결과를 반환값으로 돌려줌
// - 무작위성을 쓰는 함수는 rng 파라미터로 주입받음(기본값 Math.random)

/**
 * "참치(어,드), 감자, 고구마(넥)" 형태의 입력을 파싱한다.
 * @returns {{ parsed: Record<string, string[]|null>, errors: {username: string, classes: string[]}[] }}
 *   parsed: 유저명 → 선호 클래스 배열, 클래스 미지정 시 null
 *   errors: 선호 클래스를 4개 이상 적은 유저 (parsed에서는 제외됨 — 기존 동작 유지)
 */
export function parsePlayersInput(inputString) {
  const parsed = {};
  const errors = [];

  const regex = /([^\s,\/()]+)(?:\(([^)]+)\))?/g;
  let match;

  while ((match = regex.exec(inputString)) !== null) {
    const username = match[1].trim();
    const classRaw = match[2];

    if (classRaw) {
      const classes = classRaw.split(",").map((c) => c.trim());

      if (classes.length > 3) {
        errors.push({ username, classes });
        continue;
      }

      parsed[username] = classes;
    } else {
      parsed[username] = null;
    }
  }

  return { parsed, errors };
}

/**
 * 선호 클래스가 있으면 해당 클래스별 MMR의 평균을 effectiveMMR로 사용한다.
 * 선호 클래스가 없거나(빈 배열/null) 매핑되는 MMR이 없으면 기본 mmr을 사용한다.
 * @param {Array} players parsedPlayers[p.username] 는 클래스 문자열 배열이어야 함
 */
export function calculateEffectiveMMR(players, parsedPlayers) {
  return players.map((p) => {
    const preferred = parsedPlayers[p.username];
    let effectiveMMR = p.mmr;

    if (preferred && preferred.length > 0) {
      const mmrs = preferred
        .map((cls) => {
          switch (cls) {
            case "드":
              return p.mmrD;
            case "어":
              return p.mmrA;
            case "넥":
              return p.mmrN;
            case "슴":
              return p.mmrS;
            default:
              return null;
          }
        })
        .filter((m) => m !== null);

      if (mmrs.length > 0) {
        effectiveMMR = mmrs.reduce((a, b) => a + b, 0) / mmrs.length;
      }
    }

    return { ...p, effectiveMMR };
  });
}

/**
 * 괄호 안 클래스 표기를 제거하고 쉼표로 구분된 유저 수를 센다.
 */
export function getPlayerCount(players) {
  const cleaned = players.replace(/\([^)]*\)/g, "");
  const names = cleaned
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0);

  return names.length;
}

/**
 * 드/어/넥/슴 각 클래스가 최소 2명 이상 가능한지 검사한다.
 * @returns {{ ok: boolean, missing: string[] }} missing: 2명 미만인 클래스 목록
 */
export function checkClassDistribution(players) {
  const counts = { 드: 0, 어: 0, 넥: 0, 슴: 0 };

  players.forEach((player) => {
    const classList = player.class?.split(/,\s*/).map((c) => c.trim()) || [];
    for (const cls of Object.keys(counts)) {
      if (classList.includes(cls)) counts[cls]++;
    }
  });

  const missing = Object.entries(counts)
    .filter(([, count]) => count < 2)
    .map(([cls]) => cls);

  return { ok: missing.length === 0, missing };
}

/**
 * 배열에서 무작위 1개 선택.
 */
export function pickRand(arr, rng = Math.random) {
  return arr[Math.floor(rng() * arr.length)];
}

/**
 * MMR 내림차순으로 정렬된 8명을 인덱스 쌍 (0-1, 2-3, 4-5, 6-7)으로 나눠
 * 각 쌍에서 한 명씩 A/B 팀에 분배한다.
 * @returns {{ teamAData: Array, teamBData: Array, pairs: number[][] }}
 */
export function buildTeamsByPairSplit(sorted, rng = Math.random) {
  const pairs = [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 7],
  ];
  const teamA = [];
  const teamB = [];

  for (const [i, j] of pairs) {
    const a = sorted[i];
    const b = sorted[j];
    if (rng() < 0.5) {
      teamA.push(a);
      teamB.push(b);
    } else {
      teamA.push(b);
      teamB.push(a);
    }
  }

  return { teamAData: teamA, teamBData: teamB, pairs };
}

/**
 * 같은 쌍의 두 명이 한 팀에 모여 쌍 분할 규칙을 어겼는지 검사한다.
 */
export function violatesPairSplit(team, pairs, sorted) {
  const names = new Set(team.map((p) => p.username));
  for (const [i, j] of pairs) {
    const u = sorted[i];
    const v = sorted[j];
    if (names.has(u.username) && names.has(v.username)) return true;
  }
  return false;
}

/**
 * 초기 팀 생성 제안서 규칙.
 * 상위 4명 중 2명을 무작위 시드로 뽑아 세 가지 경우로 분기한다.
 *  - Case1-A: 시드 = {1,2} → A = {1, 2, 8, (5~6 중 1명)}
 *  - Case1-B: 시드 = {3,4} → B = {1, 2, 8, (5~6 중 1명)} (1&2를 B로 묶는 미러)
 *  - Case2  : 그 외      → A = {1, (3~4 중 1명), 6, (7~8 중 1명)}, p2는 B 고정
 * @returns {{ teamAData: Array, teamBData: Array }}
 */
export function buildTeamsByProposal(sorted, rng = Math.random) {
  const [p1, p2, p3, p4, p5, p6, p7, p8] = sorted;

  // 상위 4명 중 2명을 시드로 무작위 선택 (Fisher-Yates)
  const top4 = [p1, p2, p3, p4];
  const idx = [0, 1, 2, 3];
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const seed = [top4[idx[0]], top4[idx[1]]];
  const has = (x) => seed.some((s) => s.username === x.username);

  const CASE1_A = has(p1) && has(p2); // {1,2}
  const CASE1_B = has(p3) && has(p4); // {3,4}

  let teamA = [];
  let teamB = [];

  if (CASE1_A) {
    teamA = [p1, p2, p8, pickRand([p5, p6], rng)];
  } else if (CASE1_B) {
    teamB = [p1, p2, p8, pickRand([p5, p6], rng)];
    teamA = [p1, p2, p3, p4, p5, p6, p7, p8].filter(
      (x) => !teamB.some((t) => t.username === x.username)
    );
  } else {
    // Case2: p1 → A, p2 → B 고정 / MMR6 → A 포함 / (3~4), (7~8) 각 1명 랜덤
    const pick34 = pickRand([p3, p4], rng);
    const pick78 = pickRand([p7, p8], rng);
    teamA = [p1, pick34, p6, pick78];
  }

  const ALL = [p1, p2, p3, p4, p5, p6, p7, p8];
  if (teamB.length === 0) {
    teamB = ALL.filter((x) => !teamA.some((t) => t.username === x.username));
  } else if (teamA.length === 0) {
    teamA = ALL.filter((x) => !teamB.some((t) => t.username === x.username));
  }

  return { teamAData: teamA, teamBData: teamB };
}
