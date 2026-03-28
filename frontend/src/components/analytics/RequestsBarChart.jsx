import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ANALYTICS_COLORS } from './chartTheme';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function RequestsBarChart({ title = 'Requests Over Time', data = [], valueKey = 'count', label = 'Requests' }) {
  const chartData = {
    labels: data.map((item) => item.month || item.label),
    datasets: [
      {
        label,
        data: data.map((item) => item[valueKey] || 0),
        backgroundColor: ANALYTICS_COLORS.bar,
        borderRadius: 10,
        maxBarThickness: 34,
      },
    ],
  };

  return (
    <section className="card section-card analytics-card">
      <div className="section-header">
        <h3 className="section-title">{title}</h3>
      </div>
      <div className="analytics-chart-wrap">
        <Bar
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 700 },
            scales: {
              x: {
                grid: { display: false },
              },
              y: {
                beginAtZero: true,
                ticks: { precision: 0 },
                grid: { color: ANALYTICS_COLORS.grid },
              },
            },
            plugins: {
              legend: { display: false },
            },
          }}
        />
      </div>
    </section>
  );
}
