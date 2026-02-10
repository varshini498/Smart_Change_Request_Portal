import "../styles/header.css";

export default function Header() {
  const user = JSON.parse(localStorage.getItem("user"));

  return (
    <div className="header">
      <h2>Hi, {user?.name} 👋</h2>
      <p>Smart Change Request Portal</p>
    </div>
  );
}
