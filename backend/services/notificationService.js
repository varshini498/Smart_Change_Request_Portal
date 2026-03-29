const db = require('../config/db');
const { hasRole } = require('../utils/roles');
const systemConfigService = require('./systemConfigService');

const VALID_CHANNELS = ['in_app', 'email', 'slack', 'teams'];

const buildMessageFromTemplate = (templateKey, meta = null) => {
  const title = meta?.title ? `: ${meta.title}` : '';
  switch (templateKey) {
    case 'request_submitted':
      return `Your request was submitted${title}`;
    case 'request_created':
      return `New request pending approval${title}`;
    case 'request_approved':
      return `Your request has been approved${title}`;
    case 'request_rejected':
      return `Your request has been rejected${title}`;
    case 'request_commented':
      return `A comment was added to your request${title}`;
    case 'request_next_level':
      return `Request approved and moved to next level${title}`;
    case 'request_level_advanced':
      return `Your request moved to next approval level${title}`;
    case 'sla_overdue_escalation':
      return `Request overdue and escalated${title}`;
    default:
      return templateKey || 'Notification';
  }
};

const queueNotification = ({ userId, channel = 'in_app', templateKey, meta }) => {
  if (!systemConfigService.isEnabled('enable_notifications')) {
    return null;
  }
  const finalChannel = VALID_CHANNELS.includes(channel) ? channel : 'in_app';
  const requestId = meta?.requestId || null;
  const message = buildMessageFromTemplate(templateKey, meta);
  const info = db
    .prepare(
      `INSERT INTO notifications (user_id, request_id, message, channel, template_key, status, is_read, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, 'unread', 0, ?, ?)`
    )
    .run(userId, requestId, message, finalChannel, templateKey, meta ? JSON.stringify(meta) : null, new Date().toISOString());

  return { id: info.lastInsertRowid, userId, channel: finalChannel, templateKey };
};

const markAsRead = (notificationId, userId) => {
  const info = db
    .prepare("UPDATE notifications SET status = 'read', is_read = 1, sent_at = ? WHERE id = ? AND user_id = ?")
    .run(new Date().toISOString(), notificationId, userId);
  return info.changes > 0;
};

const markAllAsRead = (userId) => {
  const info = db
    .prepare("UPDATE notifications SET status = 'read', is_read = 1, sent_at = ? WHERE user_id = ? AND is_read = 0")
    .run(new Date().toISOString(), userId);
  return info.changes;
};

const listForUser = (userId, limit = 20, unreadOnly = true) =>
  db.prepare(
    `SELECT id, user_id AS userId, request_id AS requestId, message, channel, template_key AS templateKey, status, sent_at AS sentAt, meta_json AS metaJson, created_at AS createdAt
     FROM notifications
     WHERE user_id = ?
       AND (? = 0 OR is_read = 0)
     ORDER BY created_at DESC
     LIMIT ?`
  ).all(userId, unreadOnly ? 1 : 0, limit);

const getUnreadCount = (userId) =>
  db.prepare("SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0").get(userId).count;

const getManagersAndAdmins = () =>
  db.prepare('SELECT id, role FROM users').all().filter((row) => hasRole(row.role, ['MANAGER', 'ADMIN'])).map((row) => row.id);

const createBulkNotifications = (userIds, templateKey, meta = null) => {
  if (!systemConfigService.isEnabled('enable_notifications')) {
    return;
  }
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  uniqueUserIds.forEach((userId) => {
    queueNotification({ userId, templateKey, meta, channel: 'in_app' });
  });
};

const runEscalation = () => {
  const managersAndAdmins = getManagersAndAdmins();
  if (managersAndAdmins.length === 0) return { created: 0, checked: 0 };

  const overdueRequests = db.prepare(
    `SELECT id, title, dueDate
     FROM requests
     WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'
       AND COALESCE(due_date, dueDate) IS NOT NULL
       AND datetime(COALESCE(due_date, dueDate)) < datetime('now')`
  ).all();

  overdueRequests.forEach((request) => {
    createBulkNotifications(managersAndAdmins, 'sla_overdue_escalation', {
      requestId: request.id,
      title: request.title,
      dueDate: request.dueDate,
    });
  });

  return { created: overdueRequests.length * managersAndAdmins.length, checked: overdueRequests.length };
};

module.exports = {
  queueNotification,
  markAsRead,
  markAllAsRead,
  listForUser,
  getUnreadCount,
  getManagersAndAdmins,
  createBulkNotifications,
  runEscalation,
};
