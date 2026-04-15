"use client";

import type { BurndownPoint } from "@/lib/dashboardUtils";

interface BurndownChartProps {
  data: BurndownPoint[];
  width?: number;
  height?: number;
}

const PADDING = { top: 20, right: 20, bottom: 50, left: 50 };

export function BurndownChart({
  data,
  width = 600,
  height = 350,
}: BurndownChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded border border-gray-200 bg-gray-50 p-8 text-sm text-gray-500">
        번다운 차트 데이터가 없습니다
      </div>
    );
  }

  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  const maxY = Math.max(...data.map((d) => Math.max(d.ideal, d.actual)), 1);

  const scaleX = (i: number) =>
    PADDING.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const scaleY = (v: number) =>
    PADDING.top + chartH - (v / maxY) * chartH;

  const idealPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${scaleX(i)} ${scaleY(d.ideal)}`)
    .join(" ");

  const actualPath = data
    .map((d, i) => `${i === 0 ? "M" : "L"} ${scaleX(i)} ${scaleY(d.actual)}`)
    .join(" ");

  // Y-axis ticks (5 ticks)
  const yTicks = Array.from({ length: 5 }, (_, i) =>
    Math.round((maxY / 4) * i),
  );

  // X-axis labels — show a subset to avoid crowding
  const xLabelStep = Math.max(1, Math.floor(data.length / 6));

  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-gray-700">번다운 차트</h3>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="overflow-visible"
        role="img"
        aria-label="Burndown chart"
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

        {/* X-axis labels */}
        {data.map((d, i) =>
          i % xLabelStep === 0 || i === data.length - 1 ? (
            <text
              key={`xl-${i}`}
              x={scaleX(i)}
              y={height - PADDING.bottom + 20}
              textAnchor="middle"
              fontSize={10}
              fill="#6b7280"
              transform={`rotate(-30, ${scaleX(i)}, ${height - PADDING.bottom + 20})`}
            >
              {d.date.slice(5)}
            </text>
          ) : null,
        )}

        {/* Ideal line */}
        <path
          d={idealPath}
          fill="none"
          stroke="#93c5fd"
          strokeWidth={2}
          strokeDasharray="6 3"
        />

        {/* Actual line */}
        <path
          d={actualPath}
          fill="none"
          stroke="#2563eb"
          strokeWidth={2.5}
        />

        {/* Data points on actual line */}
        {data.map((d, i) => (
          <circle
            key={`pt-${i}`}
            cx={scaleX(i)}
            cy={scaleY(d.actual)}
            r={3}
            fill="#2563eb"
          />
        ))}

        {/* Legend */}
        <line
          x1={PADDING.left}
          y1={height - 8}
          x2={PADDING.left + 20}
          y2={height - 8}
          stroke="#93c5fd"
          strokeWidth={2}
          strokeDasharray="6 3"
        />
        <text
          x={PADDING.left + 24}
          y={height - 4}
          fontSize={11}
          fill="#6b7280"
        >
          이상
        </text>
        <line
          x1={PADDING.left + 60}
          y1={height - 8}
          x2={PADDING.left + 80}
          y2={height - 8}
          stroke="#2563eb"
          strokeWidth={2.5}
        />
        <text
          x={PADDING.left + 84}
          y={height - 4}
          fontSize={11}
          fill="#6b7280"
        >
          실제
        </text>
      </svg>
    </div>
  );
}
