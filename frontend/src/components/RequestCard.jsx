// src/components/RequestCard.jsx
export default function RequestCard({ request }) {
  const { title, description, status, priority, dueDate, isOverdue } = request;

  return (
    <div style={{
      border: "1px solid #ccc",
      padding: "1rem",
      borderRadius: "5px",
      backgroundColor: isOverdue ? "#ffe5e5" : "#f9f9f9"
    }}>
      <h3>{title}</h3>
      <p>{description}</p>
      <p>Status: {status}</p>
      <p>Priority: {priority}</p>
      {dueDate && <p>Due: {new Date(dueDate).toLocaleDateString()}</p>}
      {isOverdue && <p style={{ color: "red" }}>Overdue!</p>}
    </div>
  );
}
