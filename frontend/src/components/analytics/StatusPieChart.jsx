import {
  ArcElement,
  Chart as ChartJS,
  Legend,
  Tooltip,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { getStatusColor } from './chartTheme';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StatusPieChart({ title = 'Status Distribution', data = [] }) {
  const chartData = {
    labels: data.map((item) => item.status),
    datasets: [
      {
        data: data.map((item) => item.count),
        backgroundColor: data.map((item) => getStatusColor(item.status)),
        borderWidth: 0,
      },
    ],
  };

  return (
    <section className="card section-card analytics-card">
      <div className="section-header">
        <h3 className="section-title">{title}</h3>
      </div>
      <div className="analytics-chart-wrap">
        <Pie
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 700 },
            plugins: {
              legend: {
                position: 'bottom',
                labels: { usePointStyle: true, boxWidth: 10, padding: 18 },
              },
            },
          }}
        />
      </div>
    </section>
  );
}
