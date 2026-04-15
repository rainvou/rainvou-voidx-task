"use client";

import type { VelocityPoint } from "@/lib/dashboardUtils";

interface VelocityChartProps {
  data: VelocityPoint[];
  width?: number;
  height?: number;
}

const PADDING = { top: 20, right: 20, bottom: 50, left: 50 };

export function VelocityChart({
  data,
  width = 600,
  height = 350,
}: VelocityChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded border border-gray-200 bg-gray-50 p-8 text-sm text-gray-500">
        벨로시티 데이터가 없습니다
      </div>
    );
  }

  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  const maxY = Math.max(...data.map((d) => Math.max(d.completed, d.average)), 1);
  const barCount = data.length;
  const barGap = 8;
  const barWidth = Math.max(
    12,
    Math.min(60, (chartW - barGap * (barCount + 1)) / barCount),
  );

  const scaleX = (i: number) => {
    const totalBarSpace = barCount * barWidth + (barCount - 1) * barGap;
    const startX = PADDING.left + (chartW - totalBarSpace) / 2;
    return startX + i * (barWidth + barGap) + barWidth / 2;
  };

  const scaleY = (v: number) =>
    PADDING.top + chartH - (v / maxY) * chartH;

  // Y-axis ticks (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) =>
    Math.round((maxY / 4) * i),
  );

  // Average line path
  const avgPath = data
    .map(
      (d, i) =>
        `${i === 0 ? "M" : "L"} ${scaleX(i)} ${scaleY(d.average)}`,
    )
    .join(" ");

  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">
        스프린트 벨로시티
      </h3>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="overflow-visible"
        role="img"
        aria-label="Velocity chart"
      >
        {/* Grid lines */}
        {yTicks.map((tick) => (
          <line
            key={tick}
            x1={PADDING.left}
            y1={scaleY(tick)}
            x2={width - PADDING.right}
            y2={scaleY(tick)}
            stroke="#e5e7eb"
            strokeDasharray="4 2"
          />
        ))}

        {/* Y-axis labels */}
        {yTicks.map((tick) => (
          <text
            key={`yl-${tick}`}
            x={PADDING.left - 8}
            y={scaleY(tick) + 4}
            textAnchor="end"
            fontSize={11}
            fill="#6b7280"
          >
            {tick}
          </text>
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = (d.completed / maxY) * chartH;
          return (
            <g key={d.sprintName}>
              <rect
                x={scaleX(i) - barWidth / 2}
                y={scaleY(d.completed)}
                width={barWidth}
                height={barH}
                rx={3}
                fill="#3b82f6"
                opacity={0.85}
              />
              {/* Value label on bar */}
              <text
                x={scaleX(i)}
                y={scaleY(d.completed) - 6}
                textAnchor="middle"
                fontSize={11}
                fontWeight={600}
                fill="#1e40af"
              >
                {d.completed}
              </text>
              {/* Sprint label */}
              <text
                x={scaleX(i)}
                y={height - PADDING.bottom + 16}
                textAnchor="middle"
                fontSize={10}
                fill="#6b7280"
              >
                {d.sprintName}
              </text>
            </g>
          );
        })}

        {/* Average line */}
        <path
          d={avgPath}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="6 3"
        />

        {/* Average line dots */}
        {data.map((d, i) => (
          <circle
            key={`avg-${i}`}
            cx={scaleX(i)}
            cy={scaleY(d.average)}
            r={3}
            fill="#f59e0b"
          />
        ))}

        {/* Legend */}
        <rect
          x={PADDING.left}
          y={height - 10}
          width={14}
          height={10}
          rx={2}
          fill="#3b82f6"
          opacity={0.85}
        />
        <text
          x={PADDING.left + 18}
          y={height - 2}
          fontSize={11}
          fill="#6b7280"
        >
          완료
        </text>
        <line
          x1={PADDING.left + 50}
          y1={height - 5}
          x2={PADDING.left + 70}
          y2={height - 5}
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="6 3"
        />
        <text
          x={PADDING.left + 74}
          y={height - 2}
          fontSize={11}
          fill="#6b7280"
        >
          평균
        </text>
      </svg>
    </div>
  );
}
