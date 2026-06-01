import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { PALETTE, SERIES, ChartTooltip } from "./chartTheme";

const ORDER = ["breakfast", "lunch", "dinner", "midnight"];
const ICONS = { breakfast: "🌅", lunch: "🥪", dinner: "🍽️", midnight: "🌙" };

/**
 * Spend by meal type.
 * @param totals { breakfast, lunch, dinner, midnight } -> amount
 */
export default function MealTypeBar({ totals }) {
  const data = ORDER.map((m) => ({
    name: `${ICONS[m]} ${m[0].toUpperCase()}${m.slice(1)}`,
    value: Math.round((totals[m] || 0) * 100) / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={PALETTE.mauve} strokeOpacity={0.25} vertical={false} />
        <XAxis dataKey="name" tick={{ fill: PALETTE.mauve, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: PALETTE.mauve, fontSize: 11 }} axisLine={false} tickLine={false} width={48} tickFormatter={(v) => `$${v}`} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: PALETTE.mauve, fillOpacity: 0.1 }} />
        <Bar dataKey="value" radius={[8, 8, 0, 0]} isAnimationActive animationDuration={700}>
          {data.map((_, i) => (
            <Cell key={i} fill={SERIES[i % SERIES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
