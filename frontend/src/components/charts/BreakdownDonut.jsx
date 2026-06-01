import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { SERIES, ChartTooltip } from "./chartTheme";

/**
 * Donut breakdown with a centred total.
 * @param data [{ name, value }]
 * @param centerLabel small label under the centre figure
 */
export default function BreakdownDonut({ data, centerLabel = "total" }) {
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={92}
            paddingAngle={2}
            stroke="none"
            isAnimationActive
            animationDuration={700}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={SERIES[i % SERIES.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Centre total */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xl font-extrabold tracking-tight text-ink">${total.toFixed(0)}</p>
        <p className="text-[10px] font-medium uppercase tracking-widest text-mauve">{centerLabel}</p>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-slate">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES[i % SERIES.length] }} />
            <span className="capitalize">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
