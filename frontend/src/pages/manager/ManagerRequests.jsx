import { useEffect, useState } from "react";
import axios from "axios";

const ManagerRequests = () => {
  const [requests, setRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
  try {
    const res = await axios.get(
      "http://localhost:5000/api/requests",
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );
    setRequests(res.data.requests);
  } catch (err) {
    console.log("ERROR:", err);
  }
};

  return (
    <div style={{ marginTop: "30px" }}>
      <h3>All Requests</h3>

      <table
        style={{
          width: "100%",
          background: "white",
          borderRadius: "10px",
          marginTop: "15px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
        }}
      >
        <thead style={{ background: "#0f172a", color: "white" }}>
          <tr>
            <th>Employee</th>
            <th>Created</th>
            <th>Due</th>
            <th>Status</th>
            <th>Overdue</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {requests.map((req) => (
            <tr key={req._id} style={{ textAlign: "center" }}>
              <td>{req.employeeName}</td>

              <td>
                {new Date(req.createdAt).toLocaleDateString()}
              </td>

              <td>
                {new Date(req.dueDate).toLocaleDateString()}
              </td>

              <td>{req.status}</td>

              <td>
                {req.status === "Pending" &&
                new Date(req.dueDate) < new Date()
                  ? "⚠ Overdue"
                  : "-"}
              </td>

              <td>
                <button
                  onClick={() => setSelectedRequest(req)}
                  style={{
                    padding: "6px 12px",
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                  }}
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedRequest && (
        <div style={modalStyle}>
          <div style={modalContent}>
            <h3>Request Details</h3>

            <p><strong>Employee:</strong> {selectedRequest.employeeName}</p>
            <p><strong>Request:</strong> {selectedRequest.requestText}</p>
            <p><strong>Status:</strong> {selectedRequest.status}</p>

            <button
              onClick={() => setSelectedRequest(null)}
              style={{
                marginTop: "10px",
                padding: "6px 12px",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const modalStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
};

const modalContent = {
  background: "white",
  padding: "20px",
  borderRadius: "10px",
  width: "400px",
};

export default ManagerRequests;
