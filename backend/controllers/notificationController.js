const notificationService = require('../services/notificationService');

const dispatchNotification = async (req, res) => {
  const { userId, channel, templateKey, meta } = req.body;

  if (!userId || !templateKey) {
    return res.status(400).json({ message: 'userId and templateKey are required' });
  }

  const queued = await notificationService.queueNotification({ userId, channel, templateKey, meta });

  return res.status(202).json({
    message: 'Notification queued',
    notification: queued,
  });
};

const getMyNotifications = async (req, res) => {
  const limit = Number(req.query.limit) || 30;
  const unreadOnly = req.query.unreadOnly === undefined
    ? true
    : String(req.query.unreadOnly).toLowerCase() === 'true';
  const list = await notificationService.listForUser(req.user.id, Math.min(limit, 100), unreadOnly);
  const unreadCount = await notificationService.getUnreadCount(req.user.id);
  return res.json({ success: true, data: list, unreadCount });
};

const markNotificationRead = async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid notification id' });

  const updated = await notificationService.markAsRead(id, req.user.id);
  if (!updated) return res.status(404).json({ success: false, message: 'Notification not found' });
  return res.json({ success: true, message: 'Notification marked as read' });
};

const markAllRead = async (req, res) => {
  const count = await notificationService.markAllAsRead(req.user.id);
  return res.json({ success: true, message: 'All notifications marked as read', updated: count });
};

const runEscalation = async (_req, res) => {
  const result = await notificationService.runEscalation();
  return res.json({ message: 'Escalation run completed', ...result });
};

module.exports = {
  dispatchNotification,
  getMyNotifications,
  markNotificationRead,
  markAllRead,
  runEscalation,
};
