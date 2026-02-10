import { Link, useNavigate } from "react-router-dom";
import "../styles/sidebar.css";

export default function Sidebar({ role }) {
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  const logout = () => {
    localStorage.clear();
    navigate("/login");
  };

  return (
    <div className="sidebar">
      <h2 className="logo">UTR Portal</h2>

      <div className="profile-box">
        <p className="name">{user?.name}</p>
        <p className="role">{role.toUpperCase()}</p>
      </div>

      <nav>
        {role === "manager" && (
          <>
            <Link to="/manager/dashboard">Dashboard</Link>
            <Link to="/manager/requests">All Requests</Link>
            <Link to="/manager/pending">Pending Requests</Link>
          </>
        )}
      </nav>

      <button className="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  );
}
