import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div style={styles.nav}>
      <h2>Smart Change Request Portal</h2>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

const styles = {
  nav: {
    background: "#1e3c72",
    color: "white",
    padding: "15px 30px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  }
};
