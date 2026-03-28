import {
  Bar,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart as RechartsBarChart,
} from 'recharts';

export default function BarChart({ title, data = [], dataKey = 'count', nameKey = 'month', color = '#2563eb' }) {
  return (
    <section className="card analytics-panel">
      <div className="analytics-panel-header">
        <h3>{title}</h3>
      </div>
      <div className="analytics-chart-area">
        <ResponsiveContainer width="100%" height={320}>
          <RechartsBarChart data={data} margin={{ top: 8, right: 10, left: -20, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.18)" />
            <XAxis dataKey={nameKey} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey={dataKey} fill={color} radius={[10, 10, 4, 4]} animationDuration={850} />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
