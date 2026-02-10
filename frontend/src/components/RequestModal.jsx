import { useState } from "react";
import axios from "../api/axios";
import "../styles/modal.css";

export default function RequestModal({ request, onClose, refresh }) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAction = async (action) => {
    try {
      setLoading(true);

      await axios.put(
        `/manager/request/${request.id}/${action}`,
        { comment },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      refresh();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>Request Details</h2>

        <p><b>Employee:</b> {request.employeeName}</p>
        <p><b>Title:</b> {request.title}</p>
        <p><b>Description:</b> {request.description}</p>
        <p><b>Priority:</b> {request.priority}</p>
        <p><b>Due Date:</b> {request.dueDate}</p>

        {request.isOverdue && (
          <span className="badge overdue">OVERDUE</span>
        )}

        <hr />

        <p><b>Employee Comment:</b></p>
        <p className="employee-comment">{request.comment || "—"}</p>

        <textarea
          placeholder="Manager comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <div className="modal-actions">
          <button
            className="approve"
            onClick={() => handleAction("approve")}
            disabled={loading}
          >
            Approve
          </button>

          <button
            className="reject"
            onClick={() => handleAction("reject")}
            disabled={loading}
          >
            Reject
          </button>

          <button className="close" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
