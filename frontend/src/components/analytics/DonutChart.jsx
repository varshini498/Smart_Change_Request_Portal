import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

const COLORS = {
  APPROVED: '#22c55e',
  FULLY_APPROVED: '#22c55e',
  REJECTED: '#ef4444',
  PENDING: '#f59e0b',
  ESCALATED: '#f59e0b',
  DRAFT: '#94a3b8',
};

export default function DonutChart({ title, data = [], total = 0 }) {
  const chartData = data.map((item) => ({
    ...item,
    value: Number(item.count || 0),
    fill: COLORS[String(item.status || '').toUpperCase()] || '#64748b',
  }));

  return (
    <section className="card analytics-panel">
      <div className="analytics-panel-header">
        <h3>{title}</h3>
      </div>
      <div className="analytics-chart-area">
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="status"
              innerRadius={78}
              outerRadius={110}
              paddingAngle={4}
              animationDuration={850}
            >
              {chartData.map((entry) => (
                <Cell key={entry.status} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" iconType="circle" />
            <text x="50%" y="47%" textAnchor="middle" dominantBaseline="central" className="analytics-donut-total">
              {total}
            </text>
            <text x="50%" y="56%" textAnchor="middle" dominantBaseline="central" className="analytics-donut-label">
              Total Requests
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
