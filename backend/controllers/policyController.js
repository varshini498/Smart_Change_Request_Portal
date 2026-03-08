const policyService = require('../services/policyService');

const validateRequest = (req, res) => {
  const requestId = Number(req.params.id);

  if (Number.isNaN(requestId)) {
    return res.status(400).json({ message: 'Invalid request id' });
  }

  const result = policyService.validateRequestById(requestId);
  if (!result.found) {
    return res.status(404).json({ message: 'Request not found' });
  }

  return res.json({
    requestId,
    violationCount: result.violations.length,
    warningCount: result.warnings.length,
    violations: result.violations,
    warnings: result.warnings,
  });
};

module.exports = { validateRequest };
