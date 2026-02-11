import { Link, Outlet } from "react-router-dom";
import { FaHome, FaClipboardList, FaClock, FaUser, FaSignOutAlt } from "react-icons/fa";

const ManagerLayout = () => {
  const managerName = localStorage.getItem("name");

  return (
    <div style={{ display: "flex", height: "100vh" }}>

      {/* Sidebar */}
      <div style={{
        width: "250px",
        background: "#1e293b",
        color: "white",
        padding: "20px"
      }}>
        <h2>Manager Panel</h2>
        <hr />

        <p><Link to="/manager/dashboard" style={linkStyle}><FaHome /> Dashboard</Link></p>
        <p><Link to="/manager/requests" style={linkStyle}><FaClipboardList /> All Requests</Link></p>
        <p><Link to="/manager/pending" style={linkStyle}><FaClock /> Pending</Link></p>
        <p><Link to="/manager/profile" style={linkStyle}><FaUser /> Profile</Link></p>

        <p style={{ marginTop: "40px" }}>
          <Link to="/" style={linkStyle}>
            <FaSignOutAlt /> Logout
          </Link>
        </p>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "30px", background: "#f1f5f9" }}>
        <h2>Hi, {managerName} 👋</h2>
        <Outlet />
      </div>

    </div>
  );
};

const linkStyle = {
  color: "white",
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "8px 0"
};

export default ManagerLayout;
