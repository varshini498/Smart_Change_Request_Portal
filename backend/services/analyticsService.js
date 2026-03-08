const db = require('../config/db');

const buildRequestFilters = ({ from, to, department }) => {
  const where = [];
  const params = [];

  if (from) {
    where.push("datetime(r.dateCreated) >= datetime(?)");
    params.push(from);
  }

  if (to) {
    where.push("datetime(r.dateCreated) <= datetime(?)");
    params.push(to);
  }

  if (department && department !== 'All') {
    where.push("COALESCE(NULLIF(u.department, ''), 'General') = ?");
    params.push(department);
  }

  return {
    clause: where.length ? `WHERE ${where.join(' AND ')}` : '',
    params,
  };
};

const getOverview = (filters = {}) => {
  const filter = buildRequestFilters(filters);

  const totals = db
    .prepare(
      `SELECT
         COUNT(*) AS totalRequests,
         SUM(CASE WHEN r.status = 'Pending' THEN 1 ELSE 0 END) AS pendingCount,
         SUM(CASE WHEN r.status = 'Approved' THEN 1 ELSE 0 END) AS approvedCount,
         SUM(CASE WHEN r.status = 'Rejected' THEN 1 ELSE 0 END) AS rejectedCount,
         SUM(CASE WHEN r.dueDate IS NOT NULL AND datetime(r.dueDate) < datetime('now') AND r.status = 'Pending' THEN 1 ELSE 0 END) AS overdueCount
       FROM requests r
       LEFT JOIN users u ON u.id = r.createdBy
       ${filter.clause}`
    )
    .get(...filter.params);

  const avgApprovalTime = db
    .prepare(
      `SELECT
         AVG((julianday(r.actionDate) - julianday(r.dateCreated)) * 24) AS avgApprovalHours
       FROM requests r
       LEFT JOIN users u ON u.id = r.createdBy
       ${filter.clause} ${filter.clause ? 'AND' : 'WHERE'} r.status = 'Approved'
         AND r.actionDate IS NOT NULL
         AND r.dateCreated IS NOT NULL`
    )
    .get(...filter.params);

  const priorities = db
    .prepare(
      `SELECT COALESCE(NULLIF(r.priority, ''), 'Normal') AS priority, COUNT(*) AS count
       FROM requests r
       LEFT JOIN users u ON u.id = r.createdBy
       ${filter.clause}
       GROUP BY priority
       ORDER BY count DESC`
    )
    .all(...filter.params);

  return {
    ...totals,
    avgApprovalHours: Number(avgApprovalTime?.avgApprovalHours || 0).toFixed(2),
    priorities,
  };
};

const getDepartmentStats = (filters = {}) => {
  const filter = buildRequestFilters(filters);
  return db
    .prepare(
      `SELECT COALESCE(NULLIF(u.department, ''), 'General') AS department, COUNT(*) AS count
       FROM requests r
       LEFT JOIN users u ON u.id = r.createdBy
       ${filter.clause}
       GROUP BY department
       ORDER BY count DESC`
    )
    .all(...filter.params);
};

const getApprovalTime = (filters = {}) => {
  const filter = buildRequestFilters(filters);

  const summary = db
    .prepare(
      `SELECT
         AVG((julianday(r.actionDate) - julianday(r.dateCreated)) * 24) AS avgApprovalHours,
         MIN((julianday(r.actionDate) - julianday(r.dateCreated)) * 24) AS minApprovalHours,
         MAX((julianday(r.actionDate) - julianday(r.dateCreated)) * 24) AS maxApprovalHours,
         COUNT(*) AS approvedRequests
       FROM requests r
       LEFT JOIN users u ON u.id = r.createdBy
       ${filter.clause} ${filter.clause ? 'AND' : 'WHERE'} r.status = 'Approved'
         AND r.actionDate IS NOT NULL
         AND r.dateCreated IS NOT NULL`
    )
    .get(...filter.params);

  const byDepartment = db
    .prepare(
      `SELECT
         COALESCE(NULLIF(u.department, ''), 'General') AS department,
         AVG((julianday(r.actionDate) - julianday(r.dateCreated)) * 24) AS avgApprovalHours
       FROM requests r
       LEFT JOIN users u ON u.id = r.createdBy
       ${filter.clause} ${filter.clause ? 'AND' : 'WHERE'} r.status = 'Approved'
         AND r.actionDate IS NOT NULL
         AND r.dateCreated IS NOT NULL
       GROUP BY department
       ORDER BY avgApprovalHours DESC`
    )
    .all(...filter.params);

  return {
    summary: {
      ...summary,
      avgApprovalHours: Number(summary?.avgApprovalHours || 0).toFixed(2),
      minApprovalHours: Number(summary?.minApprovalHours || 0).toFixed(2),
      maxApprovalHours: Number(summary?.maxApprovalHours || 0).toFixed(2),
    },
    byDepartment: byDepartment.map((row) => ({
      ...row,
      avgApprovalHours: Number(row.avgApprovalHours || 0).toFixed(2),
    })),
  };
};

const getOverdueTrends = (filters = {}) => {
  const filter = buildRequestFilters(filters);
  return db
    .prepare(
      `SELECT date(r.dueDate) AS day, COUNT(*) AS count
       FROM requests r
       LEFT JOIN users u ON u.id = r.createdBy
       ${filter.clause} ${filter.clause ? 'AND' : 'WHERE'} r.dueDate IS NOT NULL
         AND datetime(r.dueDate) < datetime('now')
         AND r.status = 'Pending'
       GROUP BY day
       ORDER BY day ASC`
    )
    .all(...filter.params);
};

const getStatusBreakdown = (filters = {}) => {
  const filter = buildRequestFilters(filters);
  return db
    .prepare(
      `SELECT r.status AS status, COUNT(*) AS count
       FROM requests r
       LEFT JOIN users u ON u.id = r.createdBy
       ${filter.clause}
       GROUP BY r.status
       ORDER BY count DESC`
    )
    .all(...filter.params);
};

module.exports = {
  getOverview,
  getDepartmentStats,
  getApprovalTime,
  getOverdueTrends,
  getStatusBreakdown,
};
