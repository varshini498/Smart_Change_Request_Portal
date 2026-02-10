import Sidebar from "../../components/Sidebar";
import "../../styles/dashboard.css";


export default function EmployeeDashboard() {
  return (
    <div className="layout">
      <Sidebar role="Employee" />

      <div className="content">
        <h1>Welcome, Employee 👋</h1>

        <div className="card-row">
          <div className="card">Total Requests<br /><b>12</b></div>
          <div className="card pending">Pending<br /><b>4</b></div>
          <div className="card approved">Approved<br /><b>6</b></div>
          <div className="card overdue">Overdue<br /><b>2</b></div>
        </div>

        <h2>My Requests</h2>

        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Change Server Config</td>
              <td className="status pending">Pending</td>
              <td className="overdue">2025-01-10</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
