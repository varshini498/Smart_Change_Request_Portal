import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../api/axios';
import { ROLES } from '../constants/roles';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: ROLES.EMPLOYEE,
    roll_no: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post('/auth/register', form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Set up your SmartCR access</p>

        {error && <p className="hint" style={{ color: '#b91c1c', marginTop: 0 }}>{error}</p>}

        <form onSubmit={handleRegister}>
          <div className="field">
            <label>Full Name</label>
            <input className="input" name="name" value={form.name} onChange={handleChange} required />
          </div>

          <div className="field">
            <label>Email</label>
            <input className="input" type="email" name="email" value={form.email} onChange={handleChange} required />
          </div>

          <div className="field">
            <label>Employee ID</label>
            <input className="input" name="roll_no" value={form.roll_no} onChange={handleChange} required />
          </div>

          <div className="field">
            <label>Password</label>
            <input className="input" type="password" name="password" value={form.password} onChange={handleChange} required />
          </div>

          <div className="field">
            <label>Role</label>
            <select className="select" name="role" value={form.role} onChange={handleChange}>
              <option value={ROLES.EMPLOYEE}>Employee</option>
              <option value={ROLES.TEAM_LEAD}>Team Lead</option>
              <option value={ROLES.MANAGER}>Manager</option>
              <option value={ROLES.ADMIN}>Admin</option>
            </select>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>

        <p className="hint" style={{ marginTop: 14 }}>
          Already registered? <Link to="/" style={{ color: '#2563eb', fontWeight: 600 }}>Login</Link>
        </p>
      </div>
    </div>
  );
}
