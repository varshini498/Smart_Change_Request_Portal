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
  const [loading, setLoading] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState(false); // Interactive state
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
      
      localStorage.setItem("name", form.name);
      localStorage.setItem("email", form.email);
      localStorage.setItem("roll_no", form.roll_no);
      localStorage.setItem("role", form.role);

      alert("Registration Successful!");
      navigate("/"); 
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container" style={styles.container}>
      <div className="auth-card" style={styles.card}>
        <h1 style={{ color: '#3b82f6', marginBottom: '5px', fontWeight: '800' }}>SmartCR Portal</h1>
        <h2 style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: '25px' }}>Infrastructure Registration</h2>

        {error && <p className="error" style={styles.errorText}>{error}</p>}

        <form onSubmit={handleRegister}>
          <div className="input-group" style={styles.group}>
            <input name="name" placeholder="Full Name" onChange={handleChange} required style={styles.input} />
          </div>
          <div className="input-group" style={styles.group}>
            <input name="email" type="email" placeholder="Email Address" onChange={handleChange} required style={styles.input} />
          </div>
          <div className="input-group" style={styles.group}>
            <input name="roll_no" placeholder="Roll Number / Employee ID" onChange={handleChange} required style={styles.input} />
          </div>
          <div className="input-group" style={styles.group}>
            <input name="password" type="password" placeholder="Password" onChange={handleChange} required style={styles.input} />
          </div>

          <div className="input-group" style={styles.group}>
            <label style={styles.label}>Select Access Level</label>
            <select name="role" onChange={handleChange} style={styles.select} value={form.role}>
              <option value="Employee">Employee / Student</option>
              <option value="Manager">Manager / Faculty</option>
              <option value="Admin">System Administrator (Master)</option> 
            </select>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            onMouseEnter={() => setHoveredBtn(true)}
            onMouseLeave={() => setHoveredBtn(false)}
            style={{
                ...styles.button,
                transform: hoveredBtn ? 'scale(1.02)' : 'scale(1)',
                background: hoveredBtn ? '#2563eb' : '#3b82f6',
                boxShadow: hoveredBtn ? '0 10px 15px -3px rgba(59, 130, 246, 0.4)' : 'none'
            }}
          >
            {loading ? "Initializing..." : "Create Account"}
          </button>
        </form>

        <p className="auth-footer" style={{ marginTop: '20px', color: '#94a3b8' }}>
          Part of the corporate network? <Link to="/" style={{ color: '#3b82f6', fontWeight: 'bold' }}>Login</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: 'radial-gradient(circle at top left, #2d1b33 0%, #0f172a 40%, #020617 100%)',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  card: {
    background: 'rgba(255, 255, 255, 0.98)',
    padding: '40px',
    borderRadius: '24px',
    width: '400px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
    textAlign: 'center'
  },
  group: { marginBottom: '15px' },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    boxSizing: 'border-box',
    transition: 'all 0.3s ease',
    outline: 'none'
  },
  label: { display: 'block', textAlign: 'left', fontSize: '11px', marginBottom: '5px', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' },
  select: { width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', outline: 'none' },
  button: { 
    width: '100%', 
    color: 'white', 
    padding: '14px', 
    borderRadius: '12px', 
    fontWeight: 'bold', 
    border: 'none', 
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  errorText: { background: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '8px', fontSize: '13px', marginBottom: '15px' }
};