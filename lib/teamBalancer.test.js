import { describe, it, expect } from "vitest";
import {
  parsePlayersInput,
  calculateEffectiveMMR,
  getPlayerCount,
  checkClassDistribution,
  pickRand,
  buildTeamsByPairSplit,
  violatesPairSplit,
  buildTeamsByProposal,
} from "./teamBalancer.js";

// 정해진 순서대로 값을 돌려주는 결정적 rng. 배열이 소진되면 0을 반환한다.
function scriptRng(seq) {
  let i = 0;
  return () => (i < seq.length ? seq[i++] : 0);
}

// 인덱스 n → { username: "p{n}", ... }. sorted[0] === p1.
const P = (n, extra = {}) => ({ username: `p${n}`, ...extra });
const sorted8 = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => P(n));
const names = (team) => team.map((p) => p.username).sort();

describe("parsePlayersInput", () => {
  it("괄호 안 클래스를 배열로, 미지정은 null로 파싱한다", () => {
    const { parsed, errors } = parsePlayersInput("참치(어,드),감자,고구마(넥)");
    expect(parsed).toEqual({
      참치: ["어", "드"],
      감자: null,
      고구마: ["넥"],
    });
    expect(errors).toEqual([]);
  });

  it("공백/슬래시/쉼표를 모두 구분자로 처리한다", () => {
    const { parsed } = parsePlayersInput("a/b c,d");
    expect(Object.keys(parsed).sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("클래스가 4개 이상이면 errors에 담고 parsed에서는 제외한다", () => {
    const { parsed, errors } = parsePlayersInput("홍길동(어,드,넥,슴),감자");
    expect(parsed).toEqual({ 감자: null });
    expect(errors).toEqual([
      { username: "홍길동", classes: ["어", "드", "넥", "슴"] },
    ]);
  });

  it("빈 문자열은 빈 결과", () => {
    expect(parsePlayersInput("")).toEqual({ parsed: {}, errors: [] });
  });
});

describe("calculateEffectiveMMR", () => {
  const player = {
    username: "a",
    mmr: 100,
    mmrD: 80,
    mmrA: 90,
    mmrN: 70,
    mmrS: 60,
  };

  it("선호 클래스가 있으면 해당 MMR들의 평균을 쓴다", () => {
    const [r] = calculateEffectiveMMR([player], { a: ["드", "어"] });
    expect(r.effectiveMMR).toBe(85); // (80 + 90) / 2
  });

  it("선호 클래스가 null이면 기본 mmr을 유지한다", () => {
    const [r] = calculateEffectiveMMR([player], { a: null });
    expect(r.effectiveMMR).toBe(100);
  });

  it("선호 클래스가 빈 배열이면 기본 mmr을 유지한다", () => {
    const [r] = calculateEffectiveMMR([player], { a: [] });
    expect(r.effectiveMMR).toBe(100);
  });

  it("매핑되지 않는 클래스 문자만 있으면 기본 mmr을 유지한다", () => {
    const [r] = calculateEffectiveMMR([player], { a: ["X", "Y"] });
    expect(r.effectiveMMR).toBe(100);
  });

  it("원본 객체를 변형하지 않고 새 객체를 반환한다", () => {
    const input = [{ ...player }];
    const [r] = calculateEffectiveMMR(input, { a: ["드"] });
    expect(r).not.toBe(input[0]);
    expect(input[0]).not.toHaveProperty("effectiveMMR");
  });
});

describe("getPlayerCount", () => {
  it("괄호 안 클래스를 무시하고 유저 수를 센다", () => {
    expect(getPlayerCount("참치(어,드), 감자, 고구마(넥,슴)")).toBe(3);
  });

  it("빈 문자열은 0", () => {
    expect(getPlayerCount("")).toBe(0);
  });

  it("8명", () => {
    expect(getPlayerCount("a, b, c, d, e, f, g, h")).toBe(8);
  });
});

describe("checkClassDistribution", () => {
  const withClasses = (arr) => arr.map((c, i) => ({ username: `p${i}`, class: c }));

  it("네 클래스가 모두 2명 이상이면 ok", () => {
    const players = withClasses(["드", "드", "어", "어", "넥", "넥", "슴", "슴"]);
    expect(checkClassDistribution(players)).toEqual({ ok: true, missing: [] });
  });

  it("부족한 클래스를 missing으로 돌려준다", () => {
    const players = withClasses(["드", "드", "드", "드", "드", "드", "드", "드"]);
    expect(checkClassDistribution(players)).toEqual({
      ok: false,
      missing: ["어", "넥", "슴"],
    });
  });

  it("복수 클래스 표기(\"드,어\")는 각각 카운트한다", () => {
    const players = withClasses(["드,어", "드,어", "넥,슴", "넥,슴"]);
    expect(checkClassDistribution(players)).toEqual({ ok: true, missing: [] });
  });
});

describe("pickRand", () => {
  it("rng 값에 따라 인덱스를 고른다", () => {
    expect(pickRand(["a", "b"], () => 0)).toBe("a");
    expect(pickRand(["a", "b"], () => 0.99)).toBe("b");
  });
});

describe("buildTeamsByPairSplit", () => {
  it("rng<0.5면 각 쌍의 앞 인덱스가 A로 간다", () => {
    const { teamAData, teamBData } = buildTeamsByPairSplit(sorted8, () => 0.1);
    expect(names(teamAData)).toEqual(["p1", "p3", "p5", "p7"]);
    expect(names(teamBData)).toEqual(["p2", "p4", "p6", "p8"]);
  });

  it("rng>=0.5면 각 쌍의 뒤 인덱스가 A로 간다", () => {
    const { teamAData, teamBData } = buildTeamsByPairSplit(sorted8, () => 0.9);
    expect(names(teamAData)).toEqual(["p2", "p4", "p6", "p8"]);
    expect(names(teamBData)).toEqual(["p1", "p3", "p5", "p7"]);
  });

  it("어떤 rng든 4:4로 나뉘고 쌍 분할 규칙을 지킨다", () => {
    for (let t = 0; t < 200; t++) {
      const { teamAData, teamBData, pairs } = buildTeamsByPairSplit(sorted8);
      expect(teamAData).toHaveLength(4);
      expect(teamBData).toHaveLength(4);
      const all = [...names(teamAData), ...names(teamBData)].sort();
      expect(all).toEqual(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"]);
      expect(violatesPairSplit(teamAData, pairs, sorted8)).toBe(false);
      expect(violatesPairSplit(teamBData, pairs, sorted8)).toBe(false);
    }
  });
});

describe("violatesPairSplit", () => {
  const pairs = [
    [0, 1],
    [2, 3],
    [4, 5],
    [6, 7],
  ];

  it("같은 쌍의 두 명이 한 팀에 있으면 true", () => {
    const team = [P(1), P(2), P(5), P(6)]; // 쌍 [0,1]과 [4,5]가 모두 뭉침
    expect(violatesPairSplit(team, pairs, sorted8)).toBe(true);
  });

  it("모든 쌍이 갈라져 있으면 false", () => {
    const team = [P(1), P(3), P(5), P(7)];
    expect(violatesPairSplit(team, pairs, sorted8)).toBe(false);
  });
});

describe("buildTeamsByProposal", () => {
  it("Case1-A: 시드 {1,2} → A = {1,2,8, 5~6 중 1명}", () => {
    const { teamAData, teamBData } = buildTeamsByProposal(
      sorted8,
      scriptRng([0.99, 0.99, 0.99, 0.99])
    );
    expect(names(teamAData)).toEqual(["p1", "p2", "p6", "p8"]);
    expect(names(teamBData)).toEqual(["p3", "p4", "p5", "p7"]);
  });

  it("Case1-B: 시드 {3,4} → B = {1,2,8, 5~6 중 1명}", () => {
    const { teamAData, teamBData } = buildTeamsByProposal(
      sorted8,
      scriptRng([0, 0.5, 0, 0])
    );
    expect(names(teamBData)).toEqual(["p1", "p2", "p5", "p8"]);
    expect(names(teamAData)).toEqual(["p3", "p4", "p6", "p7"]);
  });

  it("Case2: p1은 A, p2는 B, 6은 A, (3~4)/(7~8) 각 1명", () => {
    const { teamAData, teamBData } = buildTeamsByProposal(
      sorted8,
      scriptRng([0, 0, 0, 0, 0])
    );
    expect(names(teamAData)).toEqual(["p1", "p3", "p6", "p7"]);
    expect(names(teamBData)).toEqual(["p2", "p4", "p5", "p8"]);
  });

  it("어떤 rng든 항상 4:4이고 8명 전원이 정확히 한 팀에 속한다", () => {
    for (let t = 0; t < 300; t++) {
      const { teamAData, teamBData } = buildTeamsByProposal(sorted8);
      expect(teamAData).toHaveLength(4);
      expect(teamBData).toHaveLength(4);
      const all = [...names(teamAData), ...names(teamBData)].sort();
      expect(all).toEqual(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"]);
    }
  });
});
