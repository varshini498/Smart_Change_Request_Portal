const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const PHONE_REGEX = /^[+]?[0-9]{10,15}$/;
const PASSWORD_REGEX = /^(?=.*[0-9])(?=.*[!@#$%^&*()[\]{}_\-+=~`|:;"'<>,.?/\\]).{8,}$/;
const DEPARTMENTS = ['General', 'IT', 'Finance', 'HR', 'Operations', 'Security', 'Engineering', 'AIML'];
const THEMES = ['light', 'dark'];
const FONT_SIZES = ['small', 'medium', 'large'];

const ensurePreferencesRow = (userId) => {
  db.prepare(
    `INSERT OR IGNORE INTO user_preferences
     (user_id, email_enabled, notify_approved, notify_rejected, notify_comments, notify_overdue)
     VALUES (?, 1, 1, 1, 1, 1)`
  ).run(userId);
};

const normalizeBool = (v, fallback = 0) => (v === true || v === 1 || v === '1' ? 1 : v === false || v === 0 || v === '0' ? 0 : fallback);

const getMe = (req, res) => {
  try {
    const user = db
      .prepare(
        `SELECT id, name, email, role, roll_no, phone, department, profile_photo, theme, font_size
         FROM users WHERE id = ?`
      )
      .get(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ user });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch profile', error: err.message });
  }
};

const updateMe = (req, res) => {
  try {
    const { name, phone, department } = req.body || {};
    const cleanName = String(name || '').trim();
    if (!cleanName) return res.status(400).json({ message: 'Full name is required' });
    if (phone && !PHONE_REGEX.test(String(phone).trim())) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

    const finalDepartment = DEPARTMENTS.includes(department) ? department : (department ? String(department).trim().slice(0, 64) : 'General');
    const current = db.prepare('SELECT profile_photo FROM users WHERE id = ?').get(req.user.id);
    if (!current) return res.status(404).json({ message: 'User not found' });

    const photoPath = req.file ? `/uploads/profiles/${req.file.filename}` : null;

    if (req.file && current.profile_photo) {
      const prevAbsolute = path.join(process.cwd(), 'backend', current.profile_photo.replace(/^\/+/, ''));
      if (fs.existsSync(prevAbsolute)) {
        fs.unlinkSync(prevAbsolute);
      }
    }

    db.prepare(
      `UPDATE users
       SET name = ?, phone = ?, department = ?, profile_photo = COALESCE(?, profile_photo)
       WHERE id = ?`
    ).run(cleanName, phone ? String(phone).trim() : null, finalDepartment, photoPath, req.user.id);

    const user = db
      .prepare(
        `SELECT id, name, email, role, roll_no, phone, department, profile_photo, theme, font_size
         FROM users WHERE id = ?`
      )
      .get(req.user.id);
    return res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update profile', error: err.message });
  }
};

const removePhoto = (req, res) => {
  try {
    const current = db
      .prepare('SELECT profile_photo FROM users WHERE id = ?')
      .get(req.user.id);
    if (!current) return res.status(404).json({ message: 'User not found' });

    if (current.profile_photo) {
      const absolute = path.join(process.cwd(), 'backend', current.profile_photo.replace(/^\/+/, ''));
      if (fs.existsSync(absolute)) {
        fs.unlinkSync(absolute);
      }
    }

    db.prepare('UPDATE users SET profile_photo = NULL WHERE id = ?').run(req.user.id);
    return res.json({ message: 'Profile photo removed successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to remove profile photo', error: err.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body || {};
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All password fields are required' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New password and confirmation do not match' });
    }
    if (!PASSWORD_REGEX.test(newPassword)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters with 1 number and 1 special character' });
    }

    const user = db.prepare('SELECT password FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.user.id);
    return res.json({ message: 'Password changed successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to change password', error: err.message });
  }
};

const getPreferences = (req, res) => {
  try {
    ensurePreferencesRow(req.user.id);
    const preferences = db
      .prepare(
        `SELECT
           email_enabled AS emailEnabled,
           notify_approved AS notifyApproved,
           notify_rejected AS notifyRejected,
           notify_comments AS notifyComments,
           notify_overdue AS notifyOverdue
         FROM user_preferences
         WHERE user_id = ?`
      )
      .get(req.user.id);
    return res.json({ preferences });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch preferences', error: err.message });
  }
};

const updatePreferences = (req, res) => {
  try {
    ensurePreferencesRow(req.user.id);
    const body = req.body || {};
    const existing = db
      .prepare('SELECT email_enabled, notify_approved, notify_rejected, notify_comments, notify_overdue FROM user_preferences WHERE user_id = ?')
      .get(req.user.id);

    const next = {
      email_enabled: normalizeBool(body.emailEnabled, existing.email_enabled),
      notify_approved: normalizeBool(body.notifyApproved, existing.notify_approved),
      notify_rejected: normalizeBool(body.notifyRejected, existing.notify_rejected),
      notify_comments: normalizeBool(body.notifyComments, existing.notify_comments),
      notify_overdue: normalizeBool(body.notifyOverdue, existing.notify_overdue),
    };

    db.prepare(
      `UPDATE user_preferences
       SET email_enabled = ?, notify_approved = ?, notify_rejected = ?, notify_comments = ?, notify_overdue = ?
       WHERE user_id = ?`
    ).run(
      next.email_enabled,
      next.notify_approved,
      next.notify_rejected,
      next.notify_comments,
      next.notify_overdue,
      req.user.id
    );

    return res.json({ message: 'Preferences updated successfully' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update preferences', error: err.message });
  }
};

const getSettings = (req, res) => {
  try {
    const settings = db
      .prepare('SELECT theme, font_size AS fontSize FROM users WHERE id = ?')
      .get(req.user.id);
    if (!settings) return res.status(404).json({ message: 'User not found' });
    return res.json({ settings });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch settings', error: err.message });
  }
};

const updateSettings = (req, res) => {
  try {
    const { theme, fontSize } = req.body || {};
    const current = db.prepare('SELECT theme, font_size FROM users WHERE id = ?').get(req.user.id);
    if (!current) return res.status(404).json({ message: 'User not found' });

    const nextTheme = THEMES.includes(theme) ? theme : current.theme || 'light';
    const nextFont = FONT_SIZES.includes(fontSize) ? fontSize : current.font_size || 'medium';

    db.prepare('UPDATE users SET theme = ?, font_size = ? WHERE id = ?').run(nextTheme, nextFont, req.user.id);
    return res.json({ message: 'Settings updated successfully', settings: { theme: nextTheme, fontSize: nextFont } });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update settings', error: err.message });
  }
};

module.exports = {
  getMe,
  updateMe,
  removePhoto,
  changePassword,
  getPreferences,
  updatePreferences,
  getSettings,
  updateSettings,
};
