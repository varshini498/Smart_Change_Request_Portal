import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../api/axios";
import "../styles/auth.css";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "Employee",
    roll_no: ""
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false); // New: Loading state
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await axios.post("/auth/register", form);
      
      // CRITICAL: Save data so the Dashboard can display the profile correctly
      localStorage.setItem("name", form.name);
      localStorage.setItem("email", form.email);
      localStorage.setItem("roll_no", form.roll_no);
      localStorage.setItem("role", form.role);

      alert("Registration Successful!");
      navigate("/"); // Send to login
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 style={{ color: '#3b82f6', marginBottom: '5px' }}>SmartCR Portal</h1>
        <h2 style={{ fontSize: '1.2rem', color: '#64748b', marginBottom: '20px' }}>Create Account</h2>

        {error && <p className="error" style={styles.errorText}>{error}</p>}

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <input name="name" placeholder="Full Name" onChange={handleChange} required />
          </div>
          <div className="input-group">
            <input name="email" type="email" placeholder="Email Address" onChange={handleChange} required />
          </div>
          <div className="input-group">
            <input name="roll_no" placeholder="Roll Number / Employee ID" onChange={handleChange} required />
          </div>
          <div className="input-group">
            <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
          </div>

          <div className="input-group">
            <label style={styles.label}>Select Role</label>
            <select name="role" onChange={handleChange} style={styles.select}>
              <option value="Employee">Employee</option>
              <option value="Manager">Manager</option>
            </select>
          </div>

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? "Registering..." : "Sign Up"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/">Login</Link>
        </p>
      </div>
    </div>
  );
}

// Inline styles for quick layout fixes
const styles = {
  label: { display: 'block', textAlign: 'left', fontSize: '12px', marginBottom: '5px', color: '#94a3b8', fontWeight: 'bold' },
  select: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', marginBottom: '15px' },
  errorText: { background: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '15px' }
};