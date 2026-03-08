const copilotService = require('../services/copilotService');

const getCopilotDashboard = (req, res) => {
  const payload = copilotService.getCopilotData({
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

module.exports = { getCopilotDashboard };
