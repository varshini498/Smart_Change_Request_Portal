const db = require('../config/db');
const { ROLE_KEYS, hasRole } = require('../utils/roles');

const STATUS_SQL = "UPPER(REPLACE(COALESCE(r.status, r.overall_status, ''), ' ', '_'))";
const CREATED_AT_SQL = "COALESCE(r.created_at, r.dateCreated)";
const DUE_DATE_SQL = "COALESCE(r.due_date, r.dueDate)";
const CATEGORY_SQL = "COALESCE(NULLIF(r.category, ''), 'Uncategorized')";
const CREATOR_SQL = "COALESCE(r.created_by, r.createdBy)";

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
    where.push(`${CREATOR_SQL} = ?`);
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
    where.push(`date(${CREATED_AT_SQL}) >= date(?)`);
    params.push(from);
  }

  if (to) {
    where.push(`date(${CREATED_AT_SQL}) <= date(?)`);
    params.push(to);
  }

  if (category && category !== 'All') {
    where.push(`${CATEGORY_SQL} = ?`);
    params.push(category);
  }

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
};

const getKpiCounts = (filter) =>
  db.prepare(
    `SELECT
       COUNT(*) AS totalRequests,
       SUM(CASE WHEN ${STATUS_SQL} IN ('PENDING', 'ESCALATED') THEN 1 ELSE 0 END) AS pending,
       SUM(CASE WHEN ${STATUS_SQL} IN ('FULLY_APPROVED', 'APPROVED') THEN 1 ELSE 0 END) AS approved,
       SUM(CASE WHEN ${STATUS_SQL} = 'REJECTED' THEN 1 ELSE 0 END) AS rejected,
       SUM(CASE WHEN ${STATUS_SQL} = 'DRAFT' THEN 1 ELSE 0 END) AS draft
     FROM requests r
     ${filter.clause}`
  ).get(...filter.params);

const getStatusBreakdown = (filter) =>
  db.prepare(
    `SELECT ${STATUS_SQL} AS status, COUNT(*) AS count
     FROM requests r
     ${filter.clause}
     GROUP BY ${STATUS_SQL}
     ORDER BY count DESC`
  ).all(...filter.params);

const getMonthlyTrend = (filter) =>
  db.prepare(
    `SELECT
       strftime('%Y-%m', ${CREATED_AT_SQL}) AS month_key,
       COUNT(*) AS count
     FROM requests r
     ${filter.clause}
     GROUP BY month_key
     ORDER BY month_key ASC`
  ).all(...filter.params)
    .map((row) => ({
      month: monthLabel(row.month_key),
      count: row.count,
      monthKey: row.month_key,
    }));

const getCategoryBreakdown = (filter) =>
  db.prepare(
    `SELECT ${CATEGORY_SQL} AS category, COUNT(*) AS count
     FROM requests r
     ${filter.clause}
     GROUP BY ${CATEGORY_SQL}
     ORDER BY count DESC`
  ).all(...filter.params);

const getDepartmentStats = (filter) =>
  db.prepare(
    `SELECT COALESCE(NULLIF(u.department, ''), 'General') AS department, COUNT(*) AS count
     FROM requests r
     LEFT JOIN users u ON u.id = ${CREATOR_SQL}
     ${filter.clause}
     GROUP BY department
     ORDER BY count DESC`
  ).all(...filter.params);

const getApprovalTime = (filter) => {
  const approvedFilterClause = filter.clause
    ? `${filter.clause} AND ${STATUS_SQL} IN ('FULLY_APPROVED', 'APPROVED')`
    : `WHERE ${STATUS_SQL} IN ('FULLY_APPROVED', 'APPROVED')`;

  const summary = db.prepare(
    `SELECT
       AVG((julianday(COALESCE(r.completed_at, r.actionDate)) - julianday(${CREATED_AT_SQL})) * 24) AS avgApprovalHours,
       MIN((julianday(COALESCE(r.completed_at, r.actionDate)) - julianday(${CREATED_AT_SQL})) * 24) AS minApprovalHours,
       MAX((julianday(COALESCE(r.completed_at, r.actionDate)) - julianday(${CREATED_AT_SQL})) * 24) AS maxApprovalHours,
       COUNT(*) AS approvedRequests
     FROM requests r
     ${approvedFilterClause}
       AND COALESCE(r.completed_at, r.actionDate) IS NOT NULL
       AND ${CREATED_AT_SQL} IS NOT NULL`
  ).get(...filter.params);

  const byDepartment = db.prepare(
    `SELECT
       COALESCE(NULLIF(u.department, ''), 'General') AS department,
       AVG((julianday(COALESCE(r.completed_at, r.actionDate)) - julianday(${CREATED_AT_SQL})) * 24) AS avgApprovalHours
     FROM requests r
     LEFT JOIN users u ON u.id = ${CREATOR_SQL}
     ${approvedFilterClause}
       AND COALESCE(r.completed_at, r.actionDate) IS NOT NULL
       AND ${CREATED_AT_SQL} IS NOT NULL
     GROUP BY department
     ORDER BY avgApprovalHours DESC`
  ).all(...filter.params);

  return {
    summary: {
      avgApprovalHours: Number(summary?.avgApprovalHours || 0).toFixed(2),
      minApprovalHours: Number(summary?.minApprovalHours || 0).toFixed(2),
      maxApprovalHours: Number(summary?.maxApprovalHours || 0).toFixed(2),
      approvedRequests: summary?.approvedRequests || 0,
    },
    byDepartment: byDepartment.map((row) => ({
      ...row,
      avgApprovalHours: Number(row.avgApprovalHours || 0).toFixed(2),
    })),
  };
};

const getOverdueTrends = (filter) =>
  db.prepare(
    `SELECT date(${DUE_DATE_SQL}) AS day, COUNT(*) AS count
     FROM requests r
     ${filter.clause ? `${filter.clause} AND` : 'WHERE'} ${DUE_DATE_SQL} IS NOT NULL
       AND date(${DUE_DATE_SQL}) < date('now')
       AND ${STATUS_SQL} IN ('PENDING', 'ESCALATED')
     GROUP BY day
     ORDER BY day ASC`
  ).all(...filter.params);

const getEmployeeAnalytics = ({ userId, from, to, category } = {}) => {
  const filter = buildFilters({ role: ROLE_KEYS.EMPLOYEE, userId, from, to, category });
  const counts = getKpiCounts(filter);

  return {
    totalRequests: counts?.totalRequests || 0,
    approved: counts?.approved || 0,
    rejected: counts?.rejected || 0,
    pending: counts?.pending || 0,
    draft: counts?.draft || 0,
    monthlyTrend: getMonthlyTrend(filter),
    statusBreakdown: getStatusBreakdown(filter),
    byCategory: getCategoryBreakdown(filter),
  };
};

const getOverview = ({ role, userId, from, to, category } = {}) => {
  const filter = buildFilters({ role, userId, from, to, category });
  const counts = getKpiCounts(filter);

  return {
    totalRequests: counts?.totalRequests || 0,
    approved: counts?.approved || 0,
    rejected: counts?.rejected || 0,
    pending: counts?.pending || 0,
    draft: counts?.draft || 0,
    byCategory: getCategoryBreakdown(filter),
    monthlyTrend: getMonthlyTrend(filter),
    statusBreakdown: getStatusBreakdown(filter),
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
