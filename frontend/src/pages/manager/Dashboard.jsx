import { useEffect, useState } from "react";
import axios from "axios";
import RequestModal from "../../components/RequestModal";
import "../../styles/dashboard.css";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";

export default function ManagerDashboard() {
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });

  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [selectedRequest, setSelectedRequest] = useState(null); // ✅ ADDED

  const token = localStorage.getItem("token");

  // 🔹 Fetch dashboard statistics
  const fetchStats = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/manager/dashboard-stats",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setStats(res.data);
    } catch (err) {
      console.error("Stats error", err);
    }
  };

  // 🔹 Fetch all requests
  const fetchRequests = async () => {
    try {
      const res = await axios.get(
        "http://localhost:5000/api/manager/requests",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setRequests(res.data);
    } catch (err) {
      console.error("Requests error", err);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchRequests();
  }, []);

  // 🔹 Filter logic
  const filteredRequests = requests.filter((req) => {
    if (filter === "ALL") return true;
    if (filter === "OVERDUE") {
      return (
        req.status === "PENDING" &&
        new Date(req.dueDate) < new Date()
      );
    }
    return req.status === filter;
  });

  return (
    <div className="layout">
      <Sidebar role="manager" />

      <div className="content">
        <Header />

        {/* ===== STAT CARDS ===== */}
        <div className="card-row">
          <div className="card pending" onClick={() => setFilter("PENDING")}>
            <h3>Pending</h3>
            <p>{stats.pending}</p>
          </div>

          <div className="card approved" onClick={() => setFilter("APPROVED")}>
            <h3>Approved</h3>
            <p>{stats.approved}</p>
          </div>

          <div className="card rejected" onClick={() => setFilter("REJECTED")}>
            <h3>Rejected</h3>
            <p>{stats.rejected}</p>
          </div>

          <div className="card overdue" onClick={() => setFilter("OVERDUE")}>
            <h3>Overdue</h3>
          </div>
        </div>

        {/* ===== REQUESTS TABLE ===== */}
        <div className="table">
          <table width="100%">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Title</th>
                <th>Created</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Overdue</th>
                <th>Action</th> {/* ✅ ADDED */}
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="7" align="center">
                    No requests found
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const isOverdue =
                    req.status === "PENDING" &&
                    new Date(req.dueDate) < new Date();

                  return (
                    <tr key={req.id}>
                      <td>{req.createdBy?.name || "Employee"}</td>
                      <td>{req.title}</td>
                      <td>{new Date(req.dateCreated).toLocaleDateString()}</td>
                      <td>{new Date(req.dueDate).toLocaleDateString()}</td>
                      <td className={`status ${req.status.toLowerCase()}`}>
                        {req.status}
                      </td>
                      <td>
                        {isOverdue ? (
                          <span className="overdue">Overdue</span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <button
                          className="view-btn"
                          onClick={() => setSelectedRequest(req)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ===== REQUEST MODAL ===== */}
        {selectedRequest && (
          <RequestModal
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            refresh={fetchRequests}
          />
        )}
      </div>
    </div>
  );
}
