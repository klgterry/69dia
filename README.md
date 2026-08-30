# 69 내전기록실 (69Dia)

디아블로2 **69 길드**의 내전(사설 경기) 기록실 겸 팀 생성 도우미 웹 애플리케이션입니다.
시즌별 랭킹, 유저 전적/통계, 상대전적, 듀오 밸런스, 주간 랭킹, 팀 자동 밸런싱, 시상/룰렛 등을 제공합니다.

- 배포: <https://69dia.vercel.app> (Vercel)

---

## 기술 스택

| 구분 | 내용 |
|---|---|
| 프레임워크 | Next.js 15 (App Router, dev 서버는 Turbopack) |
| 언어 | JavaScript (TypeScript 미사용) |
| UI | React 18.3, Tailwind CSS v4 |
| 차트 | Recharts |
| 기타 UI | framer-motion, react-custom-roulette, react-spinners, lucide-react |
| 백엔드 | Google Apps Script(GAS) 웹앱 + Google Sheets (데이터 저장소) |
| 배포 | Vercel |

데이터베이스 서버는 별도로 없으며, **Google Sheets를 GAS 웹앱으로 감싼 것이 사실상의 백엔드**입니다.
Next.js는 `app/api/gasApi` 라우트에서 GAS로 요청을 중계하는 프록시 역할만 합니다.

---

## 시작하기

### 요구 사항
- Node.js 18+ (권장 20+)
- npm

### 환경 변수

프로젝트 루트에 `.env.local` 파일을 만들고 GAS 웹앱 URL을 지정합니다.

```bash
# .env.local
NEXT_PUBLIC_GAS_URL=https://script.google.com/macros/s/xxxxxxxx/exec
```

> `next.config.js`에서 이 값을 `GAS_URL`로 매핑하며, 실제 사용은 서버 라우트(`app/api/gasApi/route.js`)에서만 이루어집니다.

### 설치 및 실행

```bash
npm install
npm run dev      # 개발 서버 (http://localhost:3000)
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버
npm run lint     # ESLint
```

---

## 프로젝트 구조

```
app/
├── layout.js              # 루트 레이아웃 (메타데이터/OG, Footer, ViewportFixer)
├── page.js                # 홈 — 시즌별 랭킹 리더보드
├── globals.css            # Tailwind 진입점 + 전역 애니메이션
├── ViewportFixer.js       # 경로 변경 시 viewport meta(width=1024) 강제
│
├── api/gasApi/route.js    # GAS 프록시 라우트 (GET: 쿼리 화이트리스트, POST: body 전달)
├── api/gasApi.js          # 클라이언트 헬퍼 (현재 미사용)
│
├── week/                  # 통산/주간 랭킹, 연승 랭킹
├── history/               # 게임 히스토리 + 상대전적 + 듀오 밸런스
├── ready/                 # 팀 생성 도우미 (MMR 계산 + 팀 밸런싱 + 결과 등록)
├── prize/                 # 시상/상금 + 룰렛
├── user/                  # 유저 상세 (통계/전적/듀오)
├── user-popup/            # user 페이지의 팝업 창 버전
├── setting/               # 규칙 패널
├── rule/                  # 규칙 페이지 (구버전)
├── chat/                  # GPT 챗 UI (백엔드 미구현)
├── popup1/ · popup2/      # 공지 팝업 창
│
components/
├── Footer.jsx             # 레이아웃 푸터
├── HeadToHeadSlide2.jsx   # 상대전적 슬라이드 (history)
├── DuoBalance.js          # 듀오 승률/밸런스 (history)
├── UserStatsSection.jsx   # 유저 통계 차트 (user, user-popup)
├── UserFullHistory.jsx    # 유저 전체 전적 (user, user-popup)
├── WeeklyRanking.js       # 주간 랭킹 3종 (user, user-popup)
├── Slot.js                # 슬롯머신 연출 (ready)
├── RouletteClient.jsx     # 룰렛 휠, dynamic import (prize)
├── TooltipWrapper.js      # 호버 툴팁 (DuoBalance)
└── ViewportFixer/ForceViewport/LayoutWrapper  # 뷰포트 강제(대부분 미사용)
│
public/
├── icons/nav/             # 내비게이션 버튼 이미지 (기본/hover)
├── icons/users/           # 유저 프로필 이미지 (웹_{username}.jpg)
├── icons/classes/         # 클래스 아이콘 (druid/oracle/necro/summoner)
├── icons/rank/            # 순위 아이콘, 변동 화살표
├── images/ · sfx/         # 이미지, 효과음
```

경로 별칭: `@/*` → 프로젝트 루트 (`jsconfig.json`).

---

## 아키텍처

### 데이터 흐름

```
클라이언트 컴포넌트
   │  fetch("/api/gasApi?action=...")            (GET)
   │  fetch("/api/gasApi", { method: "POST" })   (POST)
   ▼
app/api/gasApi/route.js  ── 프록시, cache: "no-store"
   │  ${NEXT_PUBLIC_GAS_URL}?action=...
   ▼
Google Apps Script 웹앱  ──▶  Google Sheets
```

- **GET**: `action`, `username`, `season`, `playerA`, `playerB`, `limit` 파라미터만 화이트리스트로 전달
- **POST**: 요청 body를 그대로 GAS로 전달 (`getPlayersInfo`, `registerResult` 등)
- 주요 `action` 예: `getCurrentSeasonSummary`, `getUserSummary`, `getSeasonPrevRank`,
  `getGameHistory`, `getUserDuoStats`, `getWeeklyRanking`, `getPrizeData`, `getRules`, `getAwardData`, `getLeaderboard`

### 렌더링 방식
- 모든 페이지가 `"use client"` 컴포넌트이며, 마운트 후 `useEffect`에서 데이터를 가져옵니다.
- 서버 컴포넌트(RSC)·서버 데이터 패칭은 사용하지 않으며, 로딩/에러 상태는 페이지마다 직접 관리합니다.
- 일부 공유 컴포넌트(`WeeklyRanking`, `UserFullHistory`, `UserStatsSection` 등)도 자체적으로 API를 호출합니다.

### 시즌 관리
시즌 목록은 `app/page.js`와 `components/HeadToHeadSlide2.jsx`에 배열로 하드코딩되어 있습니다.
**새 시즌을 열 때는 이 두 파일의 시즌 배열에 항목을 추가하고 배포**해야 합니다.

---

## 알려진 정리 대상

- `next.config.js`(사용됨)와 `next.config.mjs`(무시됨)가 함께 존재
- `app/user/page.js` ↔ `app/user-popup/page.js` 거의 완전 중복
- `app/rule/page.js` ↔ `app/setting/page.js`의 규칙 패널 중복
- 뷰포트 강제 컴포넌트 4종 중 실제 사용은 `app/ViewportFixer.js` 하나
- 미사용: `app/api/gasApi.js`, `chart.js` / `react-chartjs-2` 의존성, 빈 파일 `components/MatchList.jsx` · `components/UserInfo.jsx`
- `app/chat/page.js`가 호출하는 `/api/ask` 라우트는 존재하지 않음 (기능 미완성)

---

## 크레딧

- Developer: 마인드
- QA & Planner: 린스
- Design: 블핑, 울프
- Investment: 민형
