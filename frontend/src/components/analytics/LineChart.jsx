import {
  CartesianGrid,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export default function LineChart({ title, data = [], dataKey = 'count', nameKey = 'month', color = '#8b5cf6' }) {
  return (
    <section className="card analytics-panel">
      <div className="analytics-panel-header">
        <h3>{title}</h3>
      </div>
      <div className="analytics-chart-area">
        <ResponsiveContainer width="100%" height={320}>
          <RechartsLineChart data={data} margin={{ top: 8, right: 10, left: -20, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
            <XAxis dataKey={nameKey} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              animationDuration={850}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
