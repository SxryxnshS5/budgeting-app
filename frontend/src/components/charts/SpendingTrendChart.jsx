import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { PALETTE, ChartTooltip } from "./chartTheme";

/**
 * Monthly spend with a dashed forecast tail.
 * @param data series from withProjection() — points carry `actual` and `forecast`.
 */
export default function SpendingTrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PALETTE.slate} stopOpacity={0.35} />
            <stop offset="100%" stopColor={PALETTE.slate} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.mauve} strokeOpacity={0.25} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: PALETTE.mauve, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: PALETTE.mauve, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(v) => `$${v}`}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: PALETTE.mauve, strokeOpacity: 0.3 }} />
        <Area
          type="monotone"
          dataKey="actual"
          name="Spent"
          stroke={PALETTE.ink}
          strokeWidth={2.5}
          fill="url(#actualFill)"
          connectNulls
          dot={{ r: 3, fill: PALETTE.ink }}
          activeDot={{ r: 5 }}
          isAnimationActive
          animationDuration={800}
        />
        <Area
          type="monotone"
          dataKey="forecast"
          name="Projected"
          stroke={PALETTE.mauve}
          strokeWidth={2.5}
          strokeDasharray="5 4"
          fill="none"
          connectNulls
          dot={{ r: 3, fill: PALETTE.mauve }}
          isAnimationActive
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
