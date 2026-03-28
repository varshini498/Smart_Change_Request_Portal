import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, LoaderCircle, Lock, Mail } from 'lucide-react';
import axios from '../api/axios';
import { AuthContext } from './AuthContext';
import { ROLES, normalizeRole } from '../constants/roles';

export default function Login() {
  const { setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <div className="login-shell">
      <section className="login-visual-panel">
        <div className="auth-left-circle auth-left-circle-one" />
        <div className="auth-left-circle auth-left-circle-two" />
        <div className="login-visual-copy">
          <h1>Smart Change Request Portal</h1>
          <span className="auth-title-line" />
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-card">
          <div className="login-card-header">
            <span className="login-badge light">Secure sign in</span>
            <h2>Welcome back</h2>
            <p>Use your work account to continue to the approval workspace.</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleLogin} className="login-form">
            <div className="field">
              <label>Email</label>
              <div className="login-input-wrap">
                <Mail size={18} className="login-input-icon" />
                <input
                  className="input login-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Password</label>
              <div className="login-input-wrap">
                <Lock size={18} className="login-input-icon" />
                <input
                  className="input login-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            <button className="btn login-submit-btn" type="submit" disabled={loading}>
              {loading ? <LoaderCircle size={18} className="auth-spinner" /> : <ArrowRight size={18} />}
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="auth-divider">
            <span>Access your workspace securely</span>
          </div>

          <p className="login-footer">
            New user? <Link to="/register">Create account</Link>
          </p>

          <p className="auth-footer-note">Protected by role-based access and approval controls.</p>
        </div>
      </section>
    </div>
  );
}
