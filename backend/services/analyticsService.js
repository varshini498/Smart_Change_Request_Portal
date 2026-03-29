const { query } = require('../config/db');
const { ROLE_KEYS, hasRole } = require('../utils/roles');

const STATUS_SQL = "UPPER(REPLACE(COALESCE(r.status, r.overall_status, ''), ' ', '_'))";
const CREATED_AT_SQL = 'COALESCE(r.created_at, r."dateCreated")';
const DUE_DATE_SQL = 'COALESCE(r.due_date, r."dueDate")';
const CATEGORY_SQL = "COALESCE(NULLIF(r.category, ''), 'Uncategorized')";
const CREATOR_SQL = 'COALESCE(r.created_by, r."createdBy")';
const MONTH_KEY_SQL = `TO_CHAR(CAST(${CREATED_AT_SQL} AS TIMESTAMP), 'YYYY-MM')`;
const HOURS_DIFF_SQL = `EXTRACT(EPOCH FROM (CAST(COALESCE(r.completed_at, r."actionDate") AS TIMESTAMP) - CAST(${CREATED_AT_SQL} AS TIMESTAMP))) / 3600`;

const monthLabel = (monthKey) => {
  if (!monthKey) return '';
  const [year, month] = String(monthKey).split('-').map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'short' });
};

const buildFilters = ({ role, userId, from, to, category } = {}) => {
  const where = [];
  const params = [];

  if (hasRole(role, ROLE_KEYS.EMPLOYEE)) {
    where.push(`${CREATOR_SQL} = $${params.length + 1}`);
    params.push(userId);
  } else if (hasRole(role, ROLE_KEYS.TEAM_LEAD)) {
    where.push(
      `(CAST(COALESCE(r.current_level, 0) AS INTEGER) = 1
        OR EXISTS (
          SELECT 1
          FROM request_approvals ra
          WHERE ra.request_id = r.id
            AND UPPER(REPLACE(COALESCE(ra.level_name, ''), ' ', '_')) = 'TEAM_LEAD'
        ))`
    );
  } else if (hasRole(role, ROLE_KEYS.MANAGER)) {
    where.push(
      `(CAST(COALESCE(r.current_level, 0) AS INTEGER) = 2
        OR EXISTS (
          SELECT 1
          FROM request_approvals ra
          WHERE ra.request_id = r.id
            AND UPPER(REPLACE(COALESCE(ra.level_name, ''), ' ', '_')) = 'MANAGER'
        ))`
    );
  }

  if (from) {
    where.push(`DATE(${CREATED_AT_SQL}) >= DATE($${params.length + 1})`);
    params.push(from);
  }

  if (to) {
    where.push(`DATE(${CREATED_AT_SQL}) <= DATE($${params.length + 1})`);
    params.push(to);
  }

  if (category && category !== 'All') {
    where.push(`${CATEGORY_SQL} = $${params.length + 1}`);
    params.push(category);
  }

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
};

const getKpiCounts = async (filter) => {
  const result = await query(
    `SELECT
       COUNT(*) AS "totalRequests",
       SUM(CASE WHEN ${STATUS_SQL} IN ('PENDING', 'ESCALATED') THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN ${STATUS_SQL} IN ('FULLY_APPROVED', 'APPROVED') THEN 1 ELSE 0 END) AS approved,
       SUM(CASE WHEN ${STATUS_SQL} = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
       SUM(CASE WHEN ${STATUS_SQL} = 'DRAFT' THEN 1 ELSE 0 END) AS draft
     FROM requests r
     ${filter.clause}`,
    filter.params
  );
  return result.rows[0];
};

const getStatusBreakdown = async (filter) => {
  const result = await query(
    `SELECT ${STATUS_SQL} AS status, COUNT(*) AS count
     FROM requests r
     ${filter.clause}
     GROUP BY ${STATUS_SQL}
     ORDER BY count DESC`,
    filter.params
  );
  return result.rows;
};

const getMonthlyTrend = async (filter) => {
  const result = await query(
    `SELECT
       ${MONTH_KEY_SQL} AS month_key,
       COUNT(*) AS count
     FROM requests r
     ${filter.clause}
     GROUP BY month_key
     ORDER BY month_key ASC`,
    filter.params
  );
  return result.rows.map((row) => ({
    month: monthLabel(row.month_key),
    count: Number(row.count || 0),
    monthKey: row.month_key,
  }));
};

const getCategoryBreakdown = async (filter) => {
  const result = await query(
    `SELECT ${CATEGORY_SQL} AS category, COUNT(*) AS count
     FROM requests r
     ${filter.clause}
     GROUP BY ${CATEGORY_SQL}
     ORDER BY count DESC`,
    filter.params
  );
  return result.rows;
};

const getDepartmentStats = async (filter) => {
  const result = await query(
    `SELECT COALESCE(NULLIF(u.department, ''), 'General') AS department, COUNT(*) AS count
     FROM requests r
     LEFT JOIN users u ON u.id = ${CREATOR_SQL}
     ${filter.clause}
     GROUP BY department
     ORDER BY count DESC`,
    filter.params
  );
  return result.rows;
};

const getApprovalTime = async (filter) => {
  const approvedFilterClause = filter.clause
    ? `${filter.clause} AND ${STATUS_SQL} IN ('FULLY_APPROVED', 'APPROVED')`
    : `WHERE ${STATUS_SQL} IN ('FULLY_APPROVED', 'APPROVED')`;

  const summaryResult = await query(
    `SELECT
       AVG(${HOURS_DIFF_SQL}) AS "avgApprovalHours",
       MIN(${HOURS_DIFF_SQL}) AS "minApprovalHours",
       MAX(${HOURS_DIFF_SQL}) AS "maxApprovalHours",
       COUNT(*) AS "approvedRequests"
     FROM requests r
     ${approvedFilterClause}
       AND COALESCE(r.completed_at, r."actionDate") IS NOT NULL
       AND ${CREATED_AT_SQL} IS NOT NULL`,
    filter.params
  );

  const byDepartmentResult = await query(
    `SELECT
       COALESCE(NULLIF(u.department, ''), 'General') AS department,
       AVG(${HOURS_DIFF_SQL}) AS "avgApprovalHours"
     FROM requests r
     LEFT JOIN users u ON u.id = ${CREATOR_SQL}
     ${approvedFilterClause}
       AND COALESCE(r.completed_at, r."actionDate") IS NOT NULL
       AND ${CREATED_AT_SQL} IS NOT NULL
     GROUP BY department
     ORDER BY "avgApprovalHours" DESC`,
    filter.params
  );

  const summary = summaryResult.rows[0];
  return {
    summary: {
      avgApprovalHours: Number(summary?.avgApprovalHours || 0).toFixed(2),
      minApprovalHours: Number(summary?.minApprovalHours || 0).toFixed(2),
      maxApprovalHours: Number(summary?.maxApprovalHours || 0).toFixed(2),
      approvedRequests: Number(summary?.approvedRequests || 0),
    },
    byDepartment: byDepartmentResult.rows.map((row) => ({
      ...row,
      avgApprovalHours: Number(row.avgApprovalHours || 0).toFixed(2),
    })),
  };
};

const getOverdueTrends = async (filter) => {
  const result = await query(
    `SELECT DATE(${DUE_DATE_SQL}) AS day, COUNT(*) AS count
     FROM requests r
     ${filter.clause ? `${filter.clause} AND` : 'WHERE'} ${DUE_DATE_SQL} IS NOT NULL
       AND DATE(${DUE_DATE_SQL}) < CURRENT_DATE
       AND ${STATUS_SQL} IN ('PENDING', 'ESCALATED')
     GROUP BY day
     ORDER BY day ASC`,
    filter.params
  );
  return result.rows;
};

const getEmployeeAnalytics = async ({ userId, from, to, category } = {}) => {
  const filter = buildFilters({ role: ROLE_KEYS.EMPLOYEE, userId, from, to, category });
  const counts = await getKpiCounts(filter);

  return {
    totalRequests: Number(counts?.totalRequests || 0),
    approved: Number(counts?.approved || 0),
    rejected: Number(counts?.rejected || 0),
    pending: Number(counts?.pending || 0),
    draft: Number(counts?.draft || 0),
    monthlyTrend: await getMonthlyTrend(filter),
    statusBreakdown: await getStatusBreakdown(filter),
    byCategory: await getCategoryBreakdown(filter),
  };
};

const getOverview = async ({ role, userId, from, to, category } = {}) => {
  const filter = buildFilters({ role, userId, from, to, category });
  const counts = await getKpiCounts(filter);

  return {
    totalRequests: Number(counts?.totalRequests || 0),
    approved: Number(counts?.approved || 0),
    rejected: Number(counts?.rejected || 0),
    pending: Number(counts?.pending || 0),
    draft: Number(counts?.draft || 0),
    byCategory: await getCategoryBreakdown(filter),
    monthlyTrend: await getMonthlyTrend(filter),
    statusBreakdown: await getStatusBreakdown(filter),
  };
};

module.exports = {
  buildFilters,
  getEmployeeAnalytics,
  getOverview,
  getDepartmentStats,
  getApprovalTime,
  getOverdueTrends,
  getStatusBreakdown,
};
