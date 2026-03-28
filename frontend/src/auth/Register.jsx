import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, LoaderCircle, Lock, Mail, User, UserCog } from 'lucide-react';
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
    <div className="login-shell auth-shell">
      <section className="login-visual-panel">
        <div className="auth-left-circle auth-left-circle-one" />
        <div className="auth-left-circle auth-left-circle-two" />
        <div className="login-visual-copy">
          <h1>Smart Change Request Portal</h1>
          <span className="auth-title-line" />
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-card auth-register-card">
          <div className="login-card-header">
            <span className="login-badge light">Workspace registration</span>
            <h2>Create account</h2>
            <p>Register once to start submitting, reviewing, and tracking requests in one place.</p>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleRegister} className="login-form">
            <div className="field">
              <label>Full Name</label>
              <div className="login-input-wrap">
                <User size={18} className="login-input-icon" />
                <input
                  className="input login-input"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Email</label>
              <div className="login-input-wrap">
                <Mail size={18} className="login-input-icon" />
                <input
                  className="input login-input"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Employee ID</label>
              <div className="login-input-wrap">
                <BadgeCheck size={18} className="login-input-icon" />
                <input
                  className="input login-input"
                  name="roll_no"
                  value={form.roll_no}
                  onChange={handleChange}
                  placeholder="Enter employee ID"
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
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Role</label>
              <div className="login-input-wrap">
                <UserCog size={18} className="login-input-icon" />
                <select className="select login-input login-select" name="role" value={form.role} onChange={handleChange}>
                  <option value={ROLES.EMPLOYEE}>Employee</option>
                  <option value={ROLES.TEAM_LEAD}>Team Lead</option>
                  <option value={ROLES.MANAGER}>Manager</option>
                  <option value={ROLES.ADMIN}>Admin</option>
                </select>
              </div>
            </div>

            <button className="btn login-submit-btn" type="submit" disabled={loading}>
              {loading ? <LoaderCircle size={18} className="auth-spinner" /> : <ArrowRight size={18} />}
              <span>{loading ? 'Creating account...' : 'Create Account'}</span>
            </button>
          </form>

          <div className="auth-divider">
            <span>Consistent access across every role</span>
          </div>

          <p className="login-footer">
            Already registered? <Link to="/">Login</Link>
          </p>

          <p className="auth-footer-note">Your access level determines the workflow actions available after sign in.</p>
        </div>
      </section>
    </div>
  );
}
