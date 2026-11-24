import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartPayload } from '../types/platform';

const PALETTE = [
  '#1557B0',
  '#3C9A35',
  '#0284C7',
  '#D97706',
  '#475569',
  '#0F766E',
];

export function ChartCard({
  chart,
  compact = false,
}: {
  chart: ChartPayload;
  compact?: boolean;
}) {
  const height = compact ? 190 : 250;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-[#0F172A]">{chart.title}</h4>
        {chart.subtitle && (
          <p className="text-xs text-slate-500 mt-0.5">{chart.subtitle}</p>
        )}
      </div>
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          {chart.type === 'pie' ? (
            <PieChart>
              <Pie
                data={chart.data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={compact ? 62 : 82}
                innerRadius={compact ? 30 : 42}
                paddingAngle={2}
              >
                {chart.data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={PALETTE[index % PALETTE.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
            </PieChart>
          ) : chart.type === 'line' ? (
            <LineChart data={chart.data} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line
                type="monotone"
                dataKey="value"
                name={chart.valueLabel || 'Primary'}
                stroke="#1557B0"
                strokeWidth={2.5}
                dot={{ r: 3.5 }}
              />
              {chart.data.some((d) => typeof d.secondary === 'number') && (
                <Line
                  type="monotone"
                  dataKey="secondary"
                  name={chart.secondaryLabel || 'Secondary'}
                  stroke="#3C9A35"
                  strokeWidth={2.5}
                  dot={{ r: 3.5 }}
                />
              )}
            </LineChart>
          ) : (
            <BarChart data={chart.data} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#475569' }} />
              <YAxis tick={{ fontSize: 11, fill: '#475569' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#E2E8F0',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Bar
                dataKey="value"
                name={chart.valueLabel || 'Count'}
                radius={[6, 6, 0, 0]}
              >
                {chart.data.map((_, index) => (
                  <Cell
                    key={`bar-${index}`}
                    fill={index % 2 === 0 ? '#1557B0' : '#3C9A35'}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
