import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';
import ToastMessage from '../components/ToastMessage';
import { useTheme } from '../context/ThemeContext';
import ProfileInfo from '../components/profile/ProfileInfo';
import ChangePassword from '../components/profile/ChangePassword';
import NotificationSettings from '../components/profile/NotificationSettings';
import AppearanceSettings from '../components/profile/AppearanceSettings';

const phoneRegex = /^[+]?[0-9]{10,15}$/;
const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*()[\]{}_\-+=~`|:;"'<>,.?/\\]).{8,}$/;
const sectionOrder = ['profile', 'password', 'notifications', 'appearance'];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { theme, setTheme, fontSize, setFontSize } = useTheme();

  const [activeSection, setActiveSection] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  const [profile, setProfile] = useState(null);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', department: 'General' });
  const [editMode, setEditMode] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState('');

  const [preferences, setPreferences] = useState({
    emailEnabled: true,
    notifyApproved: true,
    notifyRejected: true,
    notifyComments: true,
    notifyOverdue: true,
  });

  const [toast, setToast] = useState({ message: '', type: 'success' });

  const imageUrl = useMemo(() => {
    if (photoPreview) return photoPreview;
    if (profile?.profile_photo) return `${API.defaults.baseURL.replace('/api', '')}${profile.profile_photo}`;
    return '';
  }, [profile, photoPreview]);

  useEffect(() => () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
  }, [photoPreview]);

  const loadAll = async () => {
    try {
      setLoading(true);
      setError('');

      const [meRes, prefsRes, settingsRes] = await Promise.all([
        API.get('/users/me'),
        API.get('/users/preferences'),
        API.get('/users/settings'),
      ]);

      const user = meRes.data.user;
      const prefs = prefsRes.data.preferences;
      const settings = settingsRes.data.settings;

      setProfile(user);
      setProfileForm({
        name: user?.name || '',
        phone: user?.phone || '',
        department: user?.department || 'General',
      });
      setPreferences({
        emailEnabled: !!prefs?.emailEnabled,
        notifyApproved: !!prefs?.notifyApproved,
        notifyRejected: !!prefs?.notifyRejected,
        notifyComments: !!prefs?.notifyComments,
        notifyOverdue: !!prefs?.notifyOverdue,
      });
      if (settings?.theme) setTheme(settings.theme);
      if (settings?.fontSize) setFontSize(settings.fontSize);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const saveProfile = async () => {
    const name = profileForm.name.trim();
    const phone = profileForm.phone.trim();

    if (!name) {
      setToast({ message: 'Full name is required', type: 'error' });
      return;
    }
    if (phone && !phoneRegex.test(phone)) {
      setToast({ message: 'Invalid phone number format', type: 'error' });
      return;
    }

    try {
      setSavingProfile(true);
      const formData = new FormData();
      formData.append('name', name);
      formData.append('phone', phone);
      formData.append('department', profileForm.department);
      if (photoFile) formData.append('profilePhoto', photoFile);

      const res = await API.put('/users/me', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setProfile(res.data.user);
      setEditMode(false);
      setPhotoFile(null);
      setPhotoPreview('');
      setToast({ message: 'Profile updated successfully', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to update profile', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const cancelEdit = () => {
    setEditMode(false);
    setPhotoFile(null);
    setPhotoPreview('');
    setProfileForm({
      name: profile?.name || '',
      phone: profile?.phone || '',
      department: profile?.department || 'General',
    });
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setToast({ message: 'Only JPG and PNG images are allowed', type: 'error' });
      e.target.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setToast({ message: 'Photo must be <= 2MB', type: 'error' });
      e.target.value = '';
      return;
    }
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const removePhoto = async () => {
    try {
      await API.delete('/users/me/photo');
      setProfile((prev) => ({ ...prev, profile_photo: null }));
      setPhotoFile(null);
      if (photoPreview) URL.revokeObjectURL(photoPreview);
      setPhotoPreview('');
      setToast({ message: 'Profile photo removed', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to remove photo', type: 'error' });
    }
  };

  const savePassword = async () => {
    setPasswordError('');
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match');
      return;
    }
    if (!passwordRegex.test(newPassword)) {
      setPasswordError('Password must be 8+ chars with 1 number and 1 special character');
      return;
    }

    try {
      setSavingPassword(true);
      await API.put('/users/change-password', passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setToast({ message: 'Password changed successfully', type: 'success' });
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  const savePreferences = async () => {
    try {
      setSavingPrefs(true);
      await API.put('/users/preferences', preferences);
      setToast({ message: 'Notification preferences saved', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to save preferences', type: 'error' });
    } finally {
      setSavingPrefs(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSavingSettings(true);
      await API.put('/users/settings', { theme, fontSize });
      setToast({ message: 'Appearance settings saved', type: 'success' });
    } catch (err) {
      setToast({ message: err.response?.data?.message || 'Failed to save settings', type: 'error' });
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <>
      <div className="auth-page" style={{ padding: 20 }}>
        <div className="auth-card" style={{ maxWidth: 1080 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h1 className="auth-title" style={{ marginBottom: 4 }}>User Profile</h1>
              <p className="auth-subtitle" style={{ margin: 0 }}>Manage your account securely</p>
            </div>
            <button className="btn btn-secondary" type="button" onClick={() => navigate(-1)}>Back</button>
          </div>

          {loading && <p className="hint">Loading profile...</p>}
          {!loading && error && (
            <div className="card" style={{ padding: 14, borderColor: '#fecaca', background: 'var(--danger-bg)' }}>
              <p style={{ margin: 0, color: 'var(--danger-text)' }}>{error}</p>
            </div>
          )}

          {!loading && !error && profile && (
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <aside className="card" style={{ width: 240, minWidth: 210, padding: 10 }}>
                {sectionOrder.map((section) => {
                  const map = {
                    profile: 'Profile Info',
                    password: 'Change Password',
                    notifications: 'Notification Preferences',
                    appearance: 'Appearance',
                  };
                  const active = activeSection === section;
                  return (
                    <button
                      key={section}
                      className="btn"
                      type="button"
                      onClick={() => setActiveSection(section)}
                      style={{
                        width: '100%',
                        marginBottom: 8,
                        textAlign: 'left',
                        background: active ? 'var(--primary-weak)' : 'var(--surface)',
                        color: active ? 'var(--primary)' : 'var(--text)',
                        borderColor: 'var(--border)',
                      }}
                    >
                      {map[section]}
                    </button>
                  );
                })}
              </aside>

              <div style={{ flex: 1 }}>
                {activeSection === 'profile' && (
                  <ProfileInfo
                    profile={profile}
                    form={profileForm}
                    setForm={setProfileForm}
                    editMode={editMode}
                    setEditMode={setEditMode}
                    imageUrl={imageUrl}
                    onFileChange={handlePhotoChange}
                    onSave={saveProfile}
                    onCancel={cancelEdit}
                    onRemovePhoto={removePhoto}
                    saving={savingProfile}
                  />
                )}

                {activeSection === 'password' && (
                  <ChangePassword
                    form={passwordForm}
                    setForm={setPasswordForm}
                    onSubmit={savePassword}
                    processing={savingPassword}
                    error={passwordError}
                  />
                )}

                {activeSection === 'notifications' && (
                  <NotificationSettings
                    preferences={preferences}
                    setPreferences={setPreferences}
                    onSave={savePreferences}
                    processing={savingPrefs}
                  />
                )}

                {activeSection === 'appearance' && (
                  <AppearanceSettings
                    theme={theme}
                    setTheme={setTheme}
                    fontSize={fontSize}
                    setFontSize={setFontSize}
                    onSave={saveSettings}
                    processing={savingSettings}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ToastMessage message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'success' })} />
    </>
  );
}
