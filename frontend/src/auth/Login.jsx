import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../api/axios';
import { AuthContext } from './AuthContext';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hoveredBtn, setHoveredBtn] = useState(false); // Interactive state
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("/auth/login", { email, password });
      
      if (!res.data.token) {
        alert("Invalid server response");
        return;
      }

      // 1. Save all data for Profile logic
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);
      localStorage.setItem("name", res.data.name);
      localStorage.setItem("email", res.data.email);    
      localStorage.setItem("roll_no", res.data.roll_no); 

      setUser({ 
        token: res.data.token, 
        role: res.data.role, 
        name: res.data.name,
        email: res.data.email,
        roll_no: res.data.roll_no 
      });

      // 2. MODIFIED REDIRECTION: Handles 3-Tier Governance
      if (res.data.role === "Admin") {
        navigate("/admin/dashboard");
      } else if (res.data.role === "Manager") {
        navigate("/manager/dashboard");
      } else {
        navigate("/employee/dashboard");
      }
    } catch (err) {
      console.error("Login Error:", err);
      alert(err.response?.data?.message || "Login Failed");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>SmartCR Portal</h1>
        <p style={styles.subtitle}>Enter your credentials to access the command center.</p>
        <form onSubmit={handleLogin}>
          <input 
            type="email" placeholder="Corporate Email" required 
            style={styles.input} onChange={(e) => setEmail(e.target.value)} 
          />
          <input 
            type="password" placeholder="Password" required 
            style={styles.input} onChange={(e) => setPassword(e.target.value)} 
          />
          <button 
            type="submit" 
            onMouseEnter={() => setHoveredBtn(true)}
            onMouseLeave={() => setHoveredBtn(false)}
            style={{
                ...styles.button,
                transform: hoveredBtn ? 'scale(1.02)' : 'scale(1)',
                background: hoveredBtn ? '#2563eb' : '#3b82f6',
                boxShadow: hoveredBtn ? '0 10px 15px -3px rgba(59, 130, 246, 0.4)' : 'none'
            }}
          >
            Sign In
          </button>
        </form>
        <p style={styles.footer}>New here? <Link to="/register" style={{color: '#3b82f6', fontWeight: 'bold'}}>Create an account</Link></p>
      </div>
    </div>
  );
}

const styles = {
  // CYBER THEME: Radial gradient background for a professional look
  container: { 
    height: '100vh', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    background: 'radial-gradient(circle at top left, #2d1b33 0%, #0f172a 40%, #020617 100%)', 
    fontFamily: '"Inter", sans-serif' 
  },
  card: { 
    background: 'rgba(255, 255, 255, 0.98)', 
    padding: '40px', 
    borderRadius: '24px', 
    width: '380px', 
    textAlign: 'center', 
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' 
  },
  title: { color: '#1e293b', marginBottom: '10px', fontSize: '26px', fontWeight: '800' },
  subtitle: { color: '#64748b', fontSize: '14px', marginBottom: '30px' },
  input: { 
    width: '100%', 
    padding: '14px', 
    marginBottom: '15px', 
    borderRadius: '10px', 
    border: '1px solid #e2e8f0', 
    boxSizing: 'border-box',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.3s ease'
  },
  button: { 
    width: '100%', 
    padding: '14px', 
    color: 'white', 
    border: 'none', 
    borderRadius: '12px', 
    fontWeight: 'bold', 
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' // Superb smooth transition
  },
  footer: { marginTop: '20px', fontSize: '13px', color: '#64748b' }
};