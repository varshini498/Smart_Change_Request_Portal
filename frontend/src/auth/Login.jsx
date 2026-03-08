import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../api/axios';
import { AuthContext } from './AuthContext';
import { ROLES, normalizeRole } from '../constants/roles';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const { setUser } = useContext(AuthContext);
  const { setTheme } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/auth/login', { email, password });
      if (!res.data.token || !res.data.user?.role) throw new Error('Invalid login response');

      localStorage.setItem('token', res.data.token);
      const role = normalizeRole(res.data.user.role);
      localStorage.setItem('role', role);
      localStorage.setItem('role_label', res.data.user.role);
      localStorage.setItem('name', res.data.user.name || '');
      localStorage.setItem('email', res.data.user.email || '');
      localStorage.setItem('roll_no', res.data.user.roll_no || '');

      setUser({
        token: res.data.token,
        role,
        name: res.data.user.name,
        email: res.data.user.email,
        roll_no: res.data.user.roll_no,
      });

      if (role === ROLES.ADMIN) navigate('/admin/dashboard');
      else if (role === ROLES.MANAGER) navigate('/manager/dashboard');
      else if (role === ROLES.TEAM_LEAD) navigate('/teamlead/dashboard');
      else navigate('/employee/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Smart Change Request Portal</h1>
        <p className="auth-subtitle">Sign in to continue</p>

        {error && <p className="hint" style={{ color: '#b91c1c', marginTop: 0 }}>{error}</p>}

        <form onSubmit={handleLogin}>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="hint" style={{ marginTop: 14 }}>
          New user? <Link to="/register" style={{ color: '#2563eb', fontWeight: 600 }}>Create account</Link>
        </p>
      </div>
    </div>
  );
}
