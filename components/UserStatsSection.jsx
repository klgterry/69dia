"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from "recharts";

const classLabelMap = {
  "드": "드루",
  "어": "어쎄",
  "넥": "네크",
  "슴": "슴딘",
};

const classColorMap = {
  "드루": "#4285F4",
  "어쎄": "#34A853",
  "슴딘": "#FBBC05",
  "네크": "#EA4335",
};

export default function UserStatsSection({ selectedUser = "규석문" }) {
  const [winDist, setWinDist] = useState([]);
  const [rankTrend, setRankTrend] = useState([]);

  useEffect(() => {
    if (!selectedUser) return;

    const fetchData = async () => {
      try {
        const distRes = await fetch(
          `/api/gasApi?action=getUserWinClassDistribution&username=${encodeURIComponent(selectedUser)}`
        );
        const trendRes = await fetch(
          `/api/gasApi?action=getUserRecentRankTrend&username=${encodeURIComponent(selectedUser)}`
        );

        if (!distRes.ok) {
          const text = await distRes.text();
          throw new Error(`WinDist API 오류\n상태코드: ${distRes.status}\n본문: ${text}`);
        }
        if (!trendRes.ok) {
          const text = await trendRes.text();
          throw new Error(`RankTrend API 오류\n상태코드: ${trendRes.status}\n본문: ${text}`);
        }

        const distData = await distRes.json();
        const trendData = await trendRes.json();

        const sortedTrend = [...trendData].sort((a, b) => new Date(a.DATE) - new Date(b.DATE));

        console.log("📊 클래스 승리 분포:", distData);
        console.log("📈 최근 순위 추이:", sortedTrend);

        setWinDist(distData);
        setRankTrend(sortedTrend);

      } catch (err) {
        console.error("❌ 통계 데이터 불러오기 실패", err);
        setWinDist([]);
        setRankTrend([]);
      }
    };

    fetchData();
  }, [selectedUser]);

  const renderCustomizedLabel = ({
    cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    const short = payload.CLASS;
    const className = classLabelMap[short] || short;
    const percentage = `${(percent * 100).toFixed(1)}%`;
  
    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="13px"
        fontWeight="bold"
        style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.7)" }} // 👈 그림자 효과
      >
        <tspan x={x} dy="-0.4em">{className}</tspan>
        <tspan x={x} dy="1.2em">{percentage}</tspan>
      </text>
    );
  };

  const renderCustomDot = (props, data) => {
    const { cx, cy, index } = props;
    const isLast = index === data.length - 1;
  
    return (
      <>
        {/* ✅ 기본 점에 key 부여 */}
        <circle
          key={`dot-circle-${index}`}
          cx={cx}
          cy={cy}
          r={4}
          stroke="#00C49F"
          strokeWidth={2}
          fill="#00C49F"
        />
  
        {/* ✅ 이미지에도 key 부여 */}
        {isLast && (
          <image
            key={`dot-img-${index}`}
            href="/icons/bg/new-tracking.png"
            x={cx - 35}
            y={cy - 48}
            width={70}
            height={70}
          />
        )}
      </>
    );
  };
  
  return (
    <div
      className="relative w-[824px] h-[400px] bg-center bg-no-repeat p-6 rounded-lg mx-auto mt-10"
      style={{
        backgroundImage: "url('/icons/bg/recent_games_bg.png')",
        backgroundSize: "824px 400px",
      }}
    >
      <h3 className="text-xl font-bold text-white mb-4 text-center drop-shadow-sm mt-5">
        📊 <span className="text-yellow-300">{selectedUser}</span>의 클래스 승률 & 랭킹 추이
      </h3>

      <div className="flex justify-between w-full px-4 mt-4">
        {/* 왼쪽: 클래스별 승률 */}
        <div className="w-[40%] relative">
          <p className="text-white font-semibold mb-2 pl-5">📈 최근 20경기 승리 클래스 분포</p>
          {winDist && winDist.length > 0 ? (
            <div className="relative w-[250px] h-[250px] mx-auto">
              {/* 🎨 배경 이미지 */}
              <img
                src="/icons/bg/ring-bg.png" // ⛳ public 폴더 기준 경로로 바꿔주세요!
                alt="도넛 배경"
                className="absolute top-0 left-0 w-full h-full object-cover z-10 pointer-events-none translate-x-[-1px]"
              />

              {/* 🍩 도넛 차트 */}
              <div className="absolute top-0 left-0 w-full h-full z-10">
                <PieChart width={250} height={250}>
                  <Pie
                    data={winDist}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}          // ← 중앙 구멍 넓게
                    outerRadius={105} 
                    labelLine={false}
                    dataKey="WINS"
                    label={renderCustomizedLabel}
                  >
                    {winDist.map((entry, index) => {
                      const label = classLabelMap[entry.CLASS] || entry.CLASS;
                      const color = classColorMap[label] || "#8884d8";
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                </PieChart>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm pl-5">데이터 없음</p>
          )}
        </div>

        {/* 오른쪽: 랭킹 추이 */}
        <div className="w-[55%]">
          <p className="text-white font-semibold mb-2 pl-5">📈 최근 5일 순위 변동</p>
          {rankTrend && rankTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={rankTrend}
              margin={{ top: 45, right: 30, left: 0, bottom: 0 }} // ← top margin 충분히 확보!
              >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="DATE"
                tick={{ fill: "white", fontSize: 12 }}
                tickFormatter={(date) =>
                  new Date(date).toLocaleDateString("ko-KR", {
                    month: "2-digit",
                    day: "2-digit",
                  })
                }
              />
              <YAxis
                reversed={true}
                domain={[1, (dataMax) => Math.max(dataMax + 1, 7)]}
                allowDecimals={false}
                tick={{ fill: "white", fontSize: 12 }}
                tickFormatter={(value) => `${value}위`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const { RANK, WINS } = payload[0].payload;
                    const date = new Date(label).toLocaleDateString("ko-KR", {
                      month: "2-digit",
                      day: "2-digit",
                    });

                    return (
                      <div className="bg-gray-800 text-white text-xs p-2 rounded shadow-md border border-gray-600">
                        <div>📅 {date}</div>
                        <div>🏆 순위: {RANK}위</div>
                        <div>⚔️ 누적 승수: {WINS}승</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="RANK"
                stroke="#00C49F"
                strokeWidth={2}
                dot={(props) => renderCustomDot(props, rankTrend)}
            >
              <LabelList
                dataKey="RANK"
                position="top"
                formatter={(value) => `${value}위`}
                fill="#ffffff"
                fontSize={12}
              />
            </Line>
            </LineChart>
          </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm">데이터 없음</p>
          )}
        </div>
      </div>
    </div>
  );
}
