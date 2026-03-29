const { query } = require('../config/db');

const parseRuleJson = (rawRule) => {
  try {
    return JSON.parse(rawRule);
  } catch (_error) {
    return null;
  }
};

const evaluateRule = (rule, request) => {
  // Minimal engine: compare exact field/value pairs and mark violations.
  if (!rule || !rule.conditions || !Array.isArray(rule.conditions)) return null;

  const matched = rule.conditions.every((condition) => {
    if (!condition || !condition.field) return false;
    return String(request[condition.field] ?? '') === String(condition.equals ?? '');
  });

  if (!matched) return null;

  return {
    code: rule.code || 'POLICY_VIOLATION',
    severity: rule.severity || 'warning',
    message: rule.message || 'Policy rule triggered',
  };
};

const validateRequestById = async (requestId) => {
  const requestResult = await query('SELECT * FROM requests WHERE id = $1', [requestId]);
  const request = requestResult.rows[0];
  if (!request) {
    return { found: false, violations: [], warnings: [] };
  }

  const rulesResult = await query(
    'SELECT id, name, scope, rule_json, is_active FROM policy_rules WHERE is_active = 1'
  );
  const rules = rulesResult.rows;

  const violations = [];
  const warnings = [];

  rules.forEach((row) => {
    const parsed = parseRuleJson(row.rule_json);
    const result = evaluateRule(parsed, request);
    if (!result) return;

    const payload = {
      ruleId: row.id,
      ruleName: row.name,
      ...result,
    };

    if (result.severity === 'error') {
      violations.push(payload);
    } else {
      warnings.push(payload);
    }
  });

  return { found: true, request, violations, warnings };
};

module.exports = { validateRequestById };
