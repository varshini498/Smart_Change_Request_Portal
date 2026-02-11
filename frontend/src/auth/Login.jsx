import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../api/axios';
import { AuthContext } from './AuthContext';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
  e.preventDefault();
  try {
    const res = await axios.post("/auth/login", { email, password });
    
    // Check if the response actually has the data
    if (!res.data.token) {
      alert("Invalid server response");
      return;
    }

    // Save everything for Asha's Profile
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

    // CRITICAL: Ensure the role string exactly matches your DB (Employee vs employee)
    if (res.data.role === "Manager") {
      navigate("/manager/dashboard");
    } else {
      navigate("/employee/dashboard");
    }
  } catch (err) {
    console.error("Login Error:", err);
    alert(err.response?.data?.message || "Login Failed - Check console for details");
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
          <button type="submit" style={styles.button}>Sign In</button>
        </form>
        <p style={styles.footer}>New here? <Link to="/register" style={{color: '#3b82f6'}}>Create an account</Link></p>
      </div>
    </div>
  );
}

const styles = {
  container: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', fontFamily: 'sans-serif' },
  card: { background: 'white', padding: '40px', borderRadius: '20px', width: '380px', textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' },
  title: { color: '#1e293b', marginBottom: '10px', fontSize: '24px', fontWeight: 'bold' },
  subtitle: { color: '#64748b', fontSize: '14px', marginBottom: '30px' },
  input: { width: '100%', padding: '12px', marginBottom: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', boxSizing: 'border-box' },
  button: { width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' },
  footer: { marginTop: '20px', fontSize: '13px', color: '#64748b' }
};