const copilotService = require('../services/copilotService');

const STOP_WORDS = new Set([
  'tell',
  'me',
  'about',
  'request',
  'give',
  'show',
  'status',
  'of',
  'the',
  'my',
  'please',
  'details',
  'summary',
  'for',
  'what',
  'is',
  'was',
  'give',
  'info',
  'information',
  'on',
]);

const extractSerialNumber = (query = '') => {
  const match = String(query || '').match(/\b\d+\b/);
  return match ? Number(match[0]) : null;
};

const extractTitleQuery = (query = '') => {
  const cleaned = String(query || '')
    .replace(/\b\d+\b/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !STOP_WORDS.has(word.toLowerCase()))
    .join(' ')
    .trim();

  return cleaned || null;
};

const formatValue = (value, fallback = 'N/A') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value);
};

const formatRequestMessage = (request) => {
  return [
    `Request "${request.title}" is currently ${formatValue(request.status)}.`,
    `Serial Number: ${formatValue(request.request_number, request.id)}`,
    `Created on: ${formatValue(request.created_at)}`,
    `Priority: ${formatValue(request.priority)}`,
    `Category: ${formatValue(request.category)}`,
  ].join('\n');
};

const isRejectionQuery = (query = '') => {
  const value = String(query || '').toLowerCase();
  return (
    value.includes('why rejected') ||
    value.includes('reason for rejection') ||
    value.includes('why was rejected')
  );
};

const isPendingQuery = (query = '') => {
  const value = String(query || '').toLowerCase();
  return (
    value.includes('pending requests') ||
    value.includes('show pending') ||
    value.includes('my pending requests')
  );
};

const getCopilotDashboard = async (req, res) => {
  const payload = await copilotService.getCopilotData({
    userId: req.user.id,
    role: req.user.role,
  });

  return res.json({
    user: {
      id: req.user.id,
      role: req.user.role,
      name: req.user.name,
    },
    copilot: payload,
  });
};

const askCopilot = async (req, res) => {
  const query = String(req.body?.query || '').trim();

  if (!query) {
    return res.status(400).json({ type: 'text', message: 'Query is required', data: null });
  }

  try {
    const userId = req.user?.id || req.body?.userId;
    const requests = await copilotService.getUserRequests(userId);

    if (!requests.length) {
      return res.json({
        type: 'text',
        message: 'You do not have any requests yet.',
        data: null,
      });
    }

    if (isRejectionQuery(query)) {
      const rejectedRequest = await copilotService.getLastRejectedRequest(userId);
      if (!rejectedRequest) {
        return res.json({
          type: 'text',
          message: "You don't have any rejected requests.",
          data: null,
        });
      }

      return res.json({
        type: 'text',
        message: `Your last rejected request "${rejectedRequest.title}" was rejected because: ${formatValue(rejectedRequest.comment, 'No rejection comment was recorded.')}`,
        data: rejectedRequest,
      });
    }

    if (isPendingQuery(query)) {
      const pendingRequests = await copilotService.getPendingRequests(userId);
      if (!pendingRequests.length) {
        return res.json({
          type: 'text',
          message: 'You have no pending requests.',
          data: [],
        });
      }

      const titles = pendingRequests.map((request, index) => `${index + 1}. ${request.title}`).join(', ');
      return res.json({
        type: 'data',
        message: `You have ${pendingRequests.length} pending requests: ${titles}`,
        data: pendingRequests,
      });
    }

    const serialNumber = extractSerialNumber(query);
    if (serialNumber !== null) {
      const request = requests[serialNumber - 1];

      if (!request) {
        return res.json({
          type: 'text',
          message: 'No request found with that number.',
          data: null,
        });
      }

      return res.json({
        type: 'data',
        message: formatRequestMessage(request),
        data: request,
      });
    }

    const titleQuery = extractTitleQuery(query);
    if (titleQuery) {
      const request = await copilotService.getRequestByTitle(titleQuery, userId);
      if (request) {
        return res.json({
          type: 'data',
          message: formatRequestMessage(request),
          data: request,
        });
      }
    }

    return res.json({
      type: 'text',
      message: 'Try asking about request number, title, pending requests, or rejection reason.',
      data: null,
    });
  } catch (error) {
    return res.status(500).json({
      type: 'text',
      message: error.message || 'Copilot request failed',
      data: null,
    });
  }
};

module.exports = {
  getCopilotDashboard,
  askCopilot,
};
