const { query } = require('../config/db');
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

const queueNotification = async ({ userId, channel = 'in_app', templateKey, meta }) => {
  if (!systemConfigService.isEnabled('enable_notifications')) {
    return null;
  }

  const finalChannel = VALID_CHANNELS.includes(channel) ? channel : 'in_app';
  const requestId = meta?.requestId || null;
  const message = buildMessageFromTemplate(templateKey, meta);
  const result = await query(
    `INSERT INTO notifications (user_id, request_id, message, channel, template_key, status, is_read, meta_json, created_at)
     VALUES ($1, $2, $3, $4, $5, 'unread', 0, $6, $7)
     RETURNING id`,
    [userId, requestId, message, finalChannel, templateKey, meta ? JSON.stringify(meta) : null, new Date().toISOString()]
  );

  return { id: result.rows[0]?.id, userId, channel: finalChannel, templateKey };
};

const markAsRead = async (notificationId, userId) => {
  const result = await query(
    "UPDATE notifications SET status = 'read', is_read = 1, sent_at = $1 WHERE id = $2 AND user_id = $3",
    [new Date().toISOString(), notificationId, userId]
  );
  return result.rowCount > 0;
};

const markAllAsRead = async (userId) => {
  const result = await query(
    "UPDATE notifications SET status = 'read', is_read = 1, sent_at = $1 WHERE user_id = $2 AND is_read = 0",
    [new Date().toISOString(), userId]
  );
  return result.rowCount;
};

const listForUser = async (userId, limit = 20, unreadOnly = true) => {
  const result = await query(
    `SELECT id, user_id AS "userId", request_id AS "requestId", message, channel, template_key AS "templateKey", status, sent_at AS "sentAt", meta_json AS "metaJson", created_at AS "createdAt"
     FROM notifications
     WHERE user_id = $1
       AND ($2 = 0 OR is_read = 0)
     ORDER BY created_at DESC
     LIMIT $3`,
    [userId, unreadOnly ? 1 : 0, limit]
  );
  return result.rows;
};

const getUnreadCount = async (userId) => {
  const result = await query('SELECT COUNT(*) AS count FROM notifications WHERE user_id = $1 AND is_read = 0', [userId]);
  return Number(result.rows[0]?.count || 0);
};

const getManagersAndAdmins = async () => {
  const result = await query('SELECT id, role FROM users');
  return result.rows.filter((row) => hasRole(row.role, ['MANAGER', 'ADMIN'])).map((row) => row.id);
};

const createBulkNotifications = async (userIds, templateKey, meta = null) => {
  if (!systemConfigService.isEnabled('enable_notifications')) {
    return [];
  }

  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  const results = await Promise.all(
    uniqueUserIds.map((userId) => queueNotification({ userId, templateKey, meta, channel: 'in_app' }))
  );
  return results.filter(Boolean);
};

const runEscalation = async () => {
  const managersAndAdmins = await getManagersAndAdmins();
  if (managersAndAdmins.length === 0) return { created: 0, checked: 0 };

  const overdueResult = await query(
    `SELECT id, title, "dueDate"
     FROM requests
     WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'PENDING'
       AND COALESCE(due_date, "dueDate") IS NOT NULL
       AND CAST(COALESCE(due_date, "dueDate") AS TIMESTAMP) < NOW()`
  );

  for (const request of overdueResult.rows) {
    await createBulkNotifications(managersAndAdmins, 'sla_overdue_escalation', {
      requestId: request.id,
      title: request.title,
      dueDate: request.dueDate,
    });
  }

  return { created: overdueResult.rows.length * managersAndAdmins.length, checked: overdueResult.rows.length };
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
