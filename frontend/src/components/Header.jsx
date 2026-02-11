export default function Header() {
  // Add a fallback {} so it doesn't crash
  const userData = localStorage.getItem("user");
  const user = userData ? JSON.parse(userData) : { name: "User" };

  return (
    <div className="header" style={{ marginBottom: '20px', padding: '10px', background: '#fff', borderRadius: '8px' }}>
      <h2 style={{ margin: 0 }}>Hi, {user?.name || "Manager"} 👋</h2>
      <p style={{ color: '#64748b', margin: '5px 0 0' }}>Smart Change Request Portal</p>
    </div>
  );
}