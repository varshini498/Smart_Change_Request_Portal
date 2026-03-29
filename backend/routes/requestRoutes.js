const express = require('express');
const db = require('../config/db');
const { query } = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { isEmployee, isAdmin } = require('../middleware/roleMiddleware');
const { ROLE_KEYS, normalizeRole, toDisplayRole, hasRole } = require('../utils/roles');
const notificationService = require('../services/notificationService');
const systemConfigService = require('../services/systemConfigService');

const router = express.Router();

const CATEGORY_VALUES = [
  'UI Change',
  'Backend Update',
  'Security Patch',
  'Database Migration',
  'Personal',
  'Others',
  'Infrastructure',
  'Application',
  'Database',
  'Security',
  'Process',
  'Other',
];

const FIXED_APPROVAL_CHAIN = [ROLE_KEYS.TEAM_LEAD, ROLE_KEYS.MANAGER];
const LEVEL_BY_ROLE = {
  [ROLE_KEYS.TEAM_LEAD]: 1,
  [ROLE_KEYS.MANAGER]: 2,
};
const ROLE_BY_LEVEL = {
  1: ROLE_KEYS.TEAM_LEAD,
  2: ROLE_KEYS.MANAGER,
};

const WORKFLOW_STATUS = {
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  ESCALATED: 'ESCALATED',
  REJECTED: 'REJECTED',
  WITHDRAWN: 'WITHDRAWN',
  FULLY_APPROVED: 'FULLY_APPROVED',
};

const normalizeWorkflowStatus = (value) => {
  const key = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');
  if (key === WORKFLOW_STATUS.PENDING) return WORKFLOW_STATUS.PENDING;
  if (key === WORKFLOW_STATUS.ESCALATED) return WORKFLOW_STATUS.ESCALATED;
  if (key === WORKFLOW_STATUS.REJECTED) return WORKFLOW_STATUS.REJECTED;
  if (key === WORKFLOW_STATUS.WITHDRAWN) return WORKFLOW_STATUS.WITHDRAWN;
  if (key === WORKFLOW_STATUS.DRAFT) return WORKFLOW_STATUS.DRAFT;
  if (key === WORKFLOW_STATUS.FULLY_APPROVED || key === 'APPROVED') return WORKFLOW_STATUS.FULLY_APPROVED;
  return WORKFLOW_STATUS.PENDING;
};

const checkIfOverdue = (dueDate, status) => {
  const normalized = normalizeWorkflowStatus(status);
  if (!dueDate || (normalized !== WORKFLOW_STATUS.PENDING && normalized !== WORKFLOW_STATUS.ESCALATED)) return false;
  return new Date(dueDate).getTime() < new Date().getTime();
};

const getNormalizedDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const getDeadlineStatus = (dueDate) => {
  const due = getNormalizedDateOnly(dueDate);
  if (!due) return 'NORMAL';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (due.getTime() < today.getTime()) return 'OVERDUE';
  if (due.getTime() === today.getTime()) return 'DUE_TODAY';
  return 'NORMAL';
};

const getRequestStatus = (request) =>
  normalizeWorkflowStatus(request.status || request.overall_status || WORKFLOW_STATUS.PENDING);
const getRequestLevel = (request) => {
  const raw = request.current_level;
  if (raw === null || raw === undefined) return null;
  const num = Number(raw);
  if (Number.isFinite(num) && ROLE_BY_LEVEL[num]) return ROLE_BY_LEVEL[num];
  return normalizeRole(raw);
};
const getRequestCreatorId = (request) => request.created_by || request.createdBy;
const normalizeApprovalAction = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '_');

const addAuditLog = async ({ requestId, action, actorId, actorRole, comment = null }) => {
  await query(
    `INSERT INTO audit_logs ("requestId", action, "actorId", "actorRole", comment, "createdAt")
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [requestId, action, actorId, actorRole, comment, new Date().toISOString()]
  );
};

const saveRequestVersionSnapshot = async ({ request, updatedBy }) => {
  if (!request?.id) return;
  const currentVersion = Number(request.version) > 0 ? Number(request.version) : 1;
  await query(
    `INSERT INTO request_versions
     (request_id, version, title, description, attachment_url, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      request.id,
      currentVersion,
      request.title || null,
      request.description || null,
      request.attachment || null,
      updatedBy || null,
      new Date().toISOString(),
    ]
  );
};

const notifyRoleUsers = async (roleName, templateKey, meta) => {
  const result = await query('SELECT id, role FROM users');
  const users = result.rows.filter((x) => hasRole(x.role, roleName)).map((x) => x.id);
  if (!users.length) return;
  await notificationService.createBulkNotifications(users, templateKey, meta);
};

const notifyUser = (userId, templateKey, meta) => {
  if (!userId) return;
  notificationService.createBulkNotifications([userId], templateKey, meta).catch((error) => {
    console.error('Notification dispatch failed:', error.message);
  });
};

const mapRequest = (request) => {
  const status = getRequestStatus(request);
  const dueDate = request.due_date || request.dueDate || null;
  return {
    ...request,
    request_number: request.request_number || request.id,
    createdBy: getRequestCreatorId(request),
    type: request.type || request.change_type || request.category || null,
    status,
    overall_status: request.overall_status || status,
    due_date: dueDate,
    dueDate: dueDate,
    deadline_status: getDeadlineStatus(dueDate),
    isOverdue: checkIfOverdue(dueDate, status),
  };
};

const mapRequestRow = (request) => mapRequest({
  ...request,
  dateCreated: request.dateCreated || request.created_at || request.createdat || null,
  dueDate: request.dueDate || request.due_date || request.duedate || null,
  createdBy: request.createdBy || request.created_by || request.createdby || null,
});

const getNextRequestNumber = async (userId) => {
  const result = await query(
    `SELECT MAX(COALESCE(request_number, 0)) AS max_request_number
     FROM requests
     WHERE COALESCE(created_by, "createdBy") = $1`,
    [userId]
  );
  return Number(result.rows[0]?.max_request_number || 0) + 1;
};

const getDefaultPriority = () => systemConfigService.getString('default_priority') || 'Medium';

const calculateDefaultDueDate = () => {
  const slaDays = systemConfigService.getNumber('sla_days');
  const dueDate = new Date();
  dueDate.setHours(0, 0, 0, 0);
  dueDate.setDate(dueDate.getDate() + slaDays);
  return dueDate.toISOString();
};

const resolveDueDate = (value) => {
  if (value) return value;
  return calculateDefaultDueDate();
};

const getTodaySubmittedCount = async (userId, excludeRequestId = null) => {
  const result = await query(
    `SELECT COUNT(*) AS count
     FROM requests
     WHERE COALESCE(created_by, "createdBy") = $1
       AND ($2::INTEGER IS NULL OR id <> $2)
       AND UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) <> 'DRAFT'
       AND CAST(COALESCE(submitted_at, created_at, "dateCreated") AS DATE) = CURRENT_DATE`,
    [userId, excludeRequestId]
  );
  return Number(result.rows[0]?.count || 0);
};

const validateDailyRequestLimit = async (userId, excludeRequestId = null) => {
  const maxRequestsPerDay = systemConfigService.getNumber('max_requests_per_day');
  const todayCount = await getTodaySubmittedCount(userId, excludeRequestId);
  if (todayCount >= maxRequestsPerDay) {
    return {
      ok: false,
      message: `Daily request limit reached. You can submit up to ${maxRequestsPerDay} requests per day.`,
    };
  }
  return { ok: true };
};

const canAccessRequest = (request, user) => {
  const isOwner = Number(getRequestCreatorId(request)) === Number(user.id);
  const isPrivileged = hasRole(user.role, [ROLE_KEYS.ADMIN, ROLE_KEYS.MANAGER, ROLE_KEYS.TEAM_LEAD]);
  return isOwner || isPrivileged;
};

const getApprovalLevelId = async (levelName) => {
  const result = await query(
    'SELECT id, role_name AS "roleName" FROM approval_levels WHERE is_active = 1 ORDER BY level_number ASC'
  );
  const row = result.rows.find((x) => normalizeRole(x.roleName) === normalizeRole(levelName));
  return row?.id || null;
};

const buildApprovalStatus = async (requestId, user) => {
  const requestResult = await query('SELECT * FROM requests WHERE id = $1', [requestId]);
  const request = requestResult.rows[0];
  if (!request) return { error: { code: 404, message: 'Request not found' } };
  if (!canAccessRequest(request, user)) return { error: { code: 403, message: 'Forbidden' } };

  const creatorId = getRequestCreatorId(request);
  const creatorResult = await query('SELECT id, name, role FROM users WHERE id = $1', [creatorId]);
  const creator = creatorResult.rows[0];

  const actionRowsResult = await query(
    `SELECT
       ra.id,
       COALESCE(ra.level_name, al.role_name) AS "levelName",
       COALESCE(ra.action, ra.status) AS action,
       ra.comment,
       ra.timestamp,
       ra.approved_by AS "approvedBy",
       COALESCE(u.name, 'Unknown User') AS "approverName"
     FROM request_approvals ra
     LEFT JOIN approval_levels al ON al.id = ra.approval_level_id
     LEFT JOIN users u ON u.id = ra.approved_by
     WHERE ra.request_id = $1
     ORDER BY CAST(COALESCE(ra.timestamp, '1970-01-01T00:00:00.000Z') AS TIMESTAMP) ASC, ra.id ASC`,
    [requestId]
  );
  const actionRows = actionRowsResult.rows;

  const latestByLevel = new Map();
  for (const row of actionRows) {
    if (!row.levelName) continue;
    latestByLevel.set(normalizeRole(row.levelName), row);
  }

  const requestStatus = getRequestStatus(request);
  const currentLevel =
    requestStatus === WORKFLOW_STATUS.PENDING || requestStatus === WORKFLOW_STATUS.ESCALATED
      ? getRequestLevel(request)
      : null;
  const currentIndex = FIXED_APPROVAL_CHAIN.indexOf(currentLevel);

  const timeline = FIXED_APPROVAL_CHAIN.map((roleName, index) => {
    const row = latestByLevel.get(roleName);
    if (row) {
      const action = normalizeApprovalAction(row.action);
      return {
        levelNumber: index + 1,
        roleName: toDisplayRole(roleName),
        status: action === 'REJECTED' ? 'Rejected' : action === 'APPROVED' ? 'Approved' : 'Pending',
        approverName: row.approverName,
        approvedBy: row.approvedBy,
        timestamp: row.timestamp,
        comment: row.comment,
      };
    }

    if (requestStatus === WORKFLOW_STATUS.FULLY_APPROVED) {
      return {
        levelNumber: index + 1,
        roleName: toDisplayRole(roleName),
        status: 'Approved',
        approverName: null,
        approvedBy: null,
        timestamp: null,
        comment: null,
      };
    }

    if (requestStatus === WORKFLOW_STATUS.REJECTED) {
      return {
        levelNumber: index + 1,
        roleName: toDisplayRole(roleName),
        status: 'Waiting',
        approverName: null,
        approvedBy: null,
        timestamp: null,
        comment: null,
      };
    }
    if (requestStatus === WORKFLOW_STATUS.WITHDRAWN) {
      return {
        levelNumber: index + 1,
        roleName: toDisplayRole(roleName),
        status: 'Waiting',
        approverName: null,
        approvedBy: null,
        timestamp: null,
        comment: null,
      };
    }

    if (currentIndex >= 0 && index === currentIndex) {
      return {
        levelNumber: index + 1,
        roleName: toDisplayRole(roleName),
        status: 'Pending',
        approverName: null,
        approvedBy: null,
        timestamp: null,
        comment: null,
      };
    }

    return {
      levelNumber: index + 1,
      roleName,
      status: 'Waiting',
      approverName: null,
      approvedBy: null,
      timestamp: null,
      comment: null,
    };
  });

  return {
    request: {
      ...mapRequest(request),
      creatorName: creator?.name || `User ${creatorId}`,
      creatorRole: toDisplayRole(creator?.role || ROLE_KEYS.EMPLOYEE),
    },
    currentLevel: currentLevel ? { roleName: toDisplayRole(currentLevel), roleKey: currentLevel } : null,
    canAct: (requestStatus === WORKFLOW_STATUS.PENDING || requestStatus === WORKFLOW_STATUS.ESCALATED) && currentLevel === user.role,
    timeline,
  };
};

const insertApprovalAction = async ({ requestId, levelName, approvedBy, action, comment, timestamp }) => {
  const approvalLevelId = await getApprovalLevelId(levelName);
  await query(
    `INSERT INTO request_approvals (request_id, approval_level_id, level_name, approved_by, status, action, comment, timestamp)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [requestId, approvalLevelId || -1, levelName, approvedBy, action, action, comment, timestamp]
  );
};

const processApprovalAction = async ({ requestId, actor, action, comment }) => {
  const requestResult = await query('SELECT * FROM requests WHERE id = $1', [requestId]);
  const request = requestResult.rows[0];
  if (!request) return { error: { code: 404, message: 'Request not found' } };

  const status = getRequestStatus(request);
  if (status !== WORKFLOW_STATUS.PENDING && status !== WORKFLOW_STATUS.ESCALATED) {
    return { error: { code: 400, message: `Request is already ${status}` } };
  }

  const currentLevel = getRequestLevel(request);
  if (!currentLevel || !FIXED_APPROVAL_CHAIN.includes(currentLevel)) {
    return { error: { code: 400, message: 'Invalid current approval level' } };
  }

  if (currentLevel !== actor.role) {
    return { error: { code: 403, message: `Only ${currentLevel} can process this request now` } };
  }

  if (!comment || !String(comment).trim()) {
    return { error: { code: 400, message: 'Comment is required' } };
  }

  const now = new Date().toISOString();
  const trimmed = String(comment).trim();
  const creatorId = getRequestCreatorId(request);

  if (action === 'reject') {
    await insertApprovalAction({
      requestId,
      levelName: currentLevel,
      approvedBy: actor.id,
      action: WORKFLOW_STATUS.REJECTED,
      comment: trimmed,
      timestamp: now,
    });

    await query(
      `UPDATE requests
       SET status = $1,
           overall_status = $2,
           current_level = NULL,
           completed_at = $3,
           comment = $4,
           "actionBy" = $5,
           "actionDate" = $6
       WHERE id = $7`,
      [
        WORKFLOW_STATUS.REJECTED,
        WORKFLOW_STATUS.REJECTED,
        now,
        trimmed,
        actor.id,
        now,
        requestId,
      ]
    );

    await addAuditLog({
      requestId,
      action: `Rejected at ${currentLevel}`,
      actorId: actor.id,
      actorRole: actor.role,
      comment: trimmed,
    });

    notifyUser(creatorId, 'request_rejected', {
      requestId,
      title: request.title,
      comment: trimmed,
      actionBy: actor.id,
      role: currentLevel,
    });

    return {
      ok: true,
      message: 'Request rejected',
      requestId,
      status: WORKFLOW_STATUS.REJECTED,
      current_level: null,
      completed_at: now,
    };
  }

  await insertApprovalAction({
    requestId,
    levelName: currentLevel,
    approvedBy: actor.id,
    action: 'APPROVED',
    comment: trimmed,
    timestamp: now,
  });

  const currentIndex = FIXED_APPROVAL_CHAIN.indexOf(currentLevel);
  const nextLevel = FIXED_APPROVAL_CHAIN[currentIndex + 1] || null;

  if (nextLevel) {
    await query(
      `UPDATE requests
       SET status = $1,
           overall_status = $2,
           current_level = $3,
           completed_at = NULL,
           comment = $4,
           "actionBy" = $5,
           "actionDate" = $6
       WHERE id = $7`,
      [WORKFLOW_STATUS.PENDING, WORKFLOW_STATUS.PENDING, LEVEL_BY_ROLE[nextLevel], trimmed, actor.id, now, requestId]
    );

    await addAuditLog({
      requestId,
      action: `Approved at ${currentLevel}. Moved to ${nextLevel}`,
      actorId: actor.id,
      actorRole: actor.role,
      comment: trimmed,
    });

    notifyRoleUsers(nextLevel, 'request_next_level', {
      requestId,
      title: request.title,
      fromRole: currentLevel,
      nextRole: nextLevel,
    });

    notifyUser(creatorId, 'request_level_advanced', {
      requestId,
      title: request.title,
      approvedByRole: currentLevel,
      nextRole: nextLevel,
    });

    return {
      ok: true,
      message: `Approved. Moved to ${nextLevel}`,
      requestId,
      status: WORKFLOW_STATUS.PENDING,
      current_level: nextLevel,
      completed_at: null,
    };
  }

  await query(
    `UPDATE requests
     SET status = $1,
         overall_status = $2,
         current_level = NULL,
         completed_at = $3,
         comment = $4,
         "actionBy" = $5,
         "actionDate" = $6
     WHERE id = $7`,
    [WORKFLOW_STATUS.FULLY_APPROVED, WORKFLOW_STATUS.FULLY_APPROVED, now, trimmed, actor.id, now, requestId]
  );

  await addAuditLog({
    requestId,
    action: WORKFLOW_STATUS.FULLY_APPROVED,
    actorId: actor.id,
    actorRole: actor.role,
    comment: trimmed,
  });

  notifyUser(creatorId, 'request_approved', {
    requestId,
    title: request.title,
    comment: trimmed,
    actionBy: actor.id,
    role: currentLevel,
  });

  return {
    ok: true,
    message: 'Request fully approved',
    requestId,
    status: WORKFLOW_STATUS.FULLY_APPROVED,
    current_level: null,
    completed_at: now,
  };
};

let requestColumnsCache = null;

const getRequestColumns = async () => {
  if (requestColumnsCache) return requestColumnsCache;
  const result = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'requests'`
  );
  requestColumnsCache = new Set(result.rows.map((col) => col.column_name));
  return requestColumnsCache;
};

const resolveRequestColumn = (preferred, fallback) => {
  if (requestColumnsCache?.has(preferred)) return preferred;
  if (fallback && requestColumnsCache?.has(fallback)) return fallback;
  return null;
};

const quoteIdentifier = (columnName) => (/^[a-z_][a-z0-9_]*$/.test(columnName) ? columnName : `"${columnName}"`);

const createRequestHandler = async (req, res) => {
  try {
    const requestColumns = await getRequestColumns();
    const { title, description, dueDate, due_date, type, priority } = req.body || {};
    const safeTitle = String(title || '').trim();
    const safeDescription = String(description || '').trim();
    const safeType = String(type || req.body?.category || req.body?.changeType || 'Others').trim();
    const safePriority = String(priority || getDefaultPriority()).trim();

    if (!safeTitle || !safeDescription) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required',
      });
    }

    const dailyLimitCheck = await validateDailyRequestLimit(req.user.id);
    if (!dailyLimitCheck.ok) {
      return res.status(400).json({
        success: false,
        message: dailyLimitCheck.message,
      });
    }

    const hasCreatedBy = requestColumns.has('createdBy');
    const hasCreatedBySnake = requestColumns.has('created_by');
    const createdByColumn = resolveRequestColumn('created_by', 'createdBy');
    const createdAtColumn = resolveRequestColumn('created_at', 'dateCreated');
    const requiredMissing = [];
    if (!requestColumns.has('title')) requiredMissing.push('title');
    if (!requestColumns.has('description')) requiredMissing.push('description');
    if (!requestColumns.has('status')) requiredMissing.push('status');
    if (!requestColumns.has('current_level')) requiredMissing.push('current_level');
    if (!createdByColumn) requiredMissing.push('created_by');
    if (!createdAtColumn) requiredMissing.push('created_at');

    if (requiredMissing.length) {
      return res.status(500).json({
        success: false,
        message: `Missing required columns in requests table: ${requiredMissing.join(', ')}`,
      });
    }

    const createdAt = new Date().toISOString();
    const requestNumber = await getNextRequestNumber(req.user.id);
    const insertColumns = ['title', 'description'];

    if (hasCreatedBySnake) insertColumns.push('created_by');
    if (hasCreatedBy && !insertColumns.includes('createdBy')) insertColumns.push('createdBy');
    if (requestColumns.has('request_number')) insertColumns.push('request_number');

    insertColumns.push('status', 'current_level');
    if (requestColumns.has('type')) insertColumns.push('type');
    if (requestColumns.has('priority')) insertColumns.push('priority');
    if (requestColumns.has('category')) insertColumns.push('category');

    const finalDueDate = resolveDueDate(due_date || dueDate || null);
    const hasDueDateSnake = requestColumns.has('due_date');
    const hasDueDateLegacy = requestColumns.has('dueDate');
    if (hasDueDateSnake) insertColumns.push('due_date');
    if (hasDueDateLegacy && !insertColumns.includes('dueDate')) insertColumns.push('dueDate');

    if (requestColumns.has('created_at')) insertColumns.push('created_at');
    if (requestColumns.has('dateCreated') && !insertColumns.includes('dateCreated')) insertColumns.push('dateCreated');
    if (requestColumns.has('submitted_at')) insertColumns.push('submitted_at');
    if (requestColumns.has('version')) insertColumns.push('version');

    const values = [safeTitle, safeDescription];

    if (hasCreatedBySnake) values.push(req.user.id);
    if (hasCreatedBy) values.push(req.user.id);
    if (requestColumns.has('request_number')) values.push(requestNumber);

    values.push(WORKFLOW_STATUS.PENDING, 1);
    if (requestColumns.has('type')) values.push(safeType);
    if (requestColumns.has('priority')) values.push(safePriority);
    if (requestColumns.has('category')) values.push(safeType);

    if (hasDueDateSnake) values.push(finalDueDate);
    if (hasDueDateLegacy) values.push(finalDueDate);

    if (requestColumns.has('created_at')) values.push(createdAt);
    if (requestColumns.has('dateCreated')) values.push(createdAt);
    if (requestColumns.has('submitted_at')) values.push(createdAt);
    if (requestColumns.has('version')) values.push(1);

    const placeholders = insertColumns.map((_, index) => `$${index + 1}`).join(', ');
    const insertSql = `INSERT INTO requests (${insertColumns.map(quoteIdentifier).join(', ')}) VALUES (${placeholders}) RETURNING id`;
    const insertResult = await query(insertSql, values);
    const requestId = insertResult.rows[0].id;

    const insertedResult = await query(
      `SELECT
         id,
         COALESCE(request_number, id) AS request_number,
         status,
         current_level,
         type,
         priority,
         COALESCE(created_at, "dateCreated") AS created_at,
         COALESCE(due_date, "dueDate") AS due_date
       FROM requests
       WHERE id = $1`,
      [requestId]
    );
    const inserted = insertedResult.rows[0];

    console.log('[REQUEST CREATED]:', inserted);

    await addAuditLog({
      requestId,
      action: 'Created',
      actorId: req.user.id,
      actorRole: req.user.role,
    });

    notifyRoleUsers(ROLE_KEYS.TEAM_LEAD, 'request_created', {
      requestId,
      title: safeTitle,
      createdBy: req.user.id,
      currentLevel: ROLE_KEYS.TEAM_LEAD,
    }).catch((error) => {
      console.error('Notification dispatch failed:', error.message);
    });

    notifyUser(req.user.id, 'request_submitted', {
      requestId,
      title: safeTitle,
    });

    return res.json({
      success: true,
      data: {
        ...inserted,
        deadline_status: getDeadlineStatus(inserted?.due_date),
      },
    });
  } catch (err) {
    console.error('CREATE REQUEST ERROR:', err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

router.post('/create', authMiddleware, isEmployee, createRequestHandler);
router.post('/', authMiddleware, isEmployee, createRequestHandler);

router.post('/draft', authMiddleware, isEmployee, async (req, res) => {
  try {
    await getRequestColumns();
    const payload = req.body || {};
    const title = String(payload.title || '').trim();
    const description = String(payload.description || '').trim();
    const priority = String(payload.priority || getDefaultPriority()).trim();
    const requestType = String(payload.type || payload.category || payload.changeType || 'Others').trim();
    const attachment = payload.attachment ?? null;
    const nextDueDate = resolveDueDate(payload.due_date ?? payload.dueDate ?? payload.implementationDate ?? null);
    const now = new Date().toISOString();
    const requestNumber = await getNextRequestNumber(req.user.id);

    const insertResult = await query(
      `INSERT INTO requests
       (title, description, created_by, "createdBy", request_number, status, overall_status, current_level, type, priority, category, attachment, due_date, "dueDate", created_at, "dateCreated", version)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING id`,
      [
        title || 'Untitled Draft',
        description || '',
        req.user.id,
        req.user.id,
        requestNumber,
        WORKFLOW_STATUS.DRAFT,
        WORKFLOW_STATUS.DRAFT,
        requestType || 'Others',
        priority || 'Medium',
        requestType || 'Others',
        attachment,
        nextDueDate,
        nextDueDate,
        now,
        now,
        1,
      ]
    );
    const requestId = insertResult.rows[0].id;

    await addAuditLog({
      requestId,
      action: 'Draft saved',
      actorId: req.user.id,
      actorRole: req.user.role,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: requestId,
        request_number: requestNumber,
        type: requestType || 'Others',
        priority: priority || 'Medium',
        status: WORKFLOW_STATUS.DRAFT,
        current_level: null,
      },
    });
  } catch (err) {
    console.error('CREATE DRAFT ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id/draft', authMiddleware, isEmployee, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const existingResult = await query(
      'SELECT * FROM requests WHERE id = $1 AND COALESCE(created_by, "createdBy") = $2',
      [id, req.user.id]
    );
    const existing = existingResult.rows[0];
    if (!existing) return res.status(404).json({ success: false, message: 'Draft not found' });
    if (getRequestStatus(existing) !== WORKFLOW_STATUS.DRAFT) {
      return res.status(400).json({ success: false, message: 'Only draft requests can be updated here' });
    }

    await saveRequestVersionSnapshot({ request: existing, updatedBy: req.user.id });

    const payload = req.body || {};
    const nextTitle = String(payload.title ?? existing.title ?? '').trim();
    const nextDescription = String(payload.description ?? existing.description ?? '').trim();
    const nextPriority = String(payload.priority ?? existing.priority ?? getDefaultPriority()).trim();
    const nextType = String(payload.type ?? payload.category ?? payload.changeType ?? existing.type ?? existing.category ?? 'Others').trim();
    const nextAttachment = payload.attachment ?? existing.attachment ?? null;
    const nextDueDate = payload.due_date ?? payload.dueDate ?? payload.implementationDate ?? existing.due_date ?? existing.dueDate ?? calculateDefaultDueDate();

    await query(
      `UPDATE requests
       SET title = $1, description = $2, type = $3, priority = $4, category = $5, attachment = $6, due_date = $7, "dueDate" = $8, version = COALESCE(version, 1) + 1
       WHERE id = $9`,
      [nextTitle || 'Untitled Draft', nextDescription || '', nextType, nextPriority, nextType, nextAttachment, nextDueDate, nextDueDate, id]
    );

    await addAuditLog({
      requestId: id,
      action: 'Draft updated',
      actorId: req.user.id,
      actorRole: req.user.role,
    });

    return res.json({ success: true, message: 'Draft updated successfully' });
  } catch (err) {
    console.error('UPDATE DRAFT ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id/submit', authMiddleware, isEmployee, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const existingResult = await query(
      'SELECT * FROM requests WHERE id = $1 AND COALESCE(created_by, "createdBy") = $2',
      [id, req.user.id]
    );
    const existing = existingResult.rows[0];
    if (!existing) return res.status(404).json({ success: false, message: 'Request not found' });

    const status = getRequestStatus(existing);
    if (status !== WORKFLOW_STATUS.DRAFT && !(status === WORKFLOW_STATUS.PENDING && getRequestLevel(existing) === ROLE_KEYS.TEAM_LEAD)) {
      return res.status(400).json({ success: false, message: 'This request cannot be submitted now' });
    }

    const title = String(existing.title || '').trim();
    const description = String(existing.description || '').trim();
    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required before submit' });
    }

    const dailyLimitCheck = await validateDailyRequestLimit(
      req.user.id,
      status === WORKFLOW_STATUS.DRAFT ? null : id
    );
    if (!dailyLimitCheck.ok) {
      return res.status(400).json({ success: false, message: dailyLimitCheck.message });
    }

    const now = new Date().toISOString();
    const fallbackDueDate = calculateDefaultDueDate();
    await query(
      `UPDATE requests
       SET status = $1, overall_status = $2, current_level = $3, submitted_at = $4, completed_at = NULL,
           priority = COALESCE(NULLIF(priority, ''), $5),
           due_date = COALESCE(due_date, "dueDate", $6),
           "dueDate" = COALESCE("dueDate", due_date, $7)
       WHERE id = $8`,
      [
        WORKFLOW_STATUS.PENDING,
        WORKFLOW_STATUS.PENDING,
        LEVEL_BY_ROLE[ROLE_KEYS.TEAM_LEAD],
        now,
        getDefaultPriority(),
        fallbackDueDate,
        fallbackDueDate,
        id,
      ]
    );

    await addAuditLog({
      requestId: id,
      action: 'Draft submitted',
      actorId: req.user.id,
      actorRole: req.user.role,
    });

    notifyRoleUsers(ROLE_KEYS.TEAM_LEAD, 'request_created', {
      requestId: id,
      title: existing.title,
      createdBy: req.user.id,
      currentLevel: ROLE_KEYS.TEAM_LEAD,
    }).catch((error) => {
      console.error('Notification dispatch failed:', error.message);
    });

    notifyUser(req.user.id, 'request_submitted', {
      requestId: id,
      title: existing.title,
    });

    return res.json({
      success: true,
      message: 'Request submitted for approval',
      data: {
        id,
        request_number: existing.request_number || id,
        status: WORKFLOW_STATUS.PENDING,
        current_level: LEVEL_BY_ROLE[ROLE_KEYS.TEAM_LEAD],
        submitted_at: now,
      },
    });
  } catch (err) {
    console.error('SUBMIT DRAFT ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id/draft', authMiddleware, isEmployee, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const existingResult = await query(
      'SELECT * FROM requests WHERE id = $1 AND COALESCE(created_by, "createdBy") = $2',
      [id, req.user.id]
    );
    const existing = existingResult.rows[0];
    if (!existing) return res.status(404).json({ success: false, message: 'Draft not found' });
    if (getRequestStatus(existing) !== WORKFLOW_STATUS.DRAFT) {
      return res.status(400).json({ success: false, message: 'Only drafts can be deleted' });
    }

    await query('DELETE FROM request_versions WHERE request_id = $1', [id]);
    await query('DELETE FROM requests WHERE id = $1', [id]);

    await addAuditLog({
      requestId: id,
      action: 'Draft deleted',
      actorId: req.user.id,
      actorRole: req.user.role,
    });

    return res.json({ success: true, message: 'Draft deleted successfully' });
  } catch (err) {
    console.error('DELETE DRAFT ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/categories', authMiddleware, async (req, res) => {
  try {
    const result = await query('SELECT id, name FROM categories ORDER BY name ASC');
    return res.json({ success: true, data: result.rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/config', authMiddleware, (req, res) => {
  return res.json({
    success: true,
    data: {
      default_priority: getDefaultPriority(),
      max_requests_per_day: systemConfigService.getNumber('max_requests_per_day'),
      enable_notifications: systemConfigService.isEnabled('enable_notifications'),
      sla_days: systemConfigService.getNumber('sla_days'),
    },
  });
});

router.get('/my', authMiddleware, isEmployee, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM requests WHERE COALESCE(created_by, "createdBy") = $1 ORDER BY CAST(COALESCE(created_at, "dateCreated") AS TIMESTAMP) DESC',
      [req.user.id]
    );
    return res.json({ requests: result.rows.map(mapRequestRow) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Employee can edit only before Team Lead approves (locked after Level 1).
router.put('/:id', authMiddleware, isEmployee, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });

  const existingResult = await query(
    'SELECT * FROM requests WHERE id = $1 AND COALESCE(created_by, "createdBy") = $2',
    [id, req.user.id]
  );
  const existing = existingResult.rows[0];
  if (!existing) return res.status(404).json({ message: 'Request not found' });

  if (getRequestStatus(existing) !== WORKFLOW_STATUS.PENDING || getRequestLevel(existing) !== ROLE_KEYS.TEAM_LEAD) {
    return res.status(400).json({ message: 'Request is locked after Level 1 approval' });
  }

  await saveRequestVersionSnapshot({ request: existing, updatedBy: req.user.id });

  const { title, description, type, priority, dueDate, due_date, category, attachment } = req.body || {};
  const nextTitle = String(title || existing.title).trim();
  const nextDescription = String(description || existing.description).trim();
  const nextPriority = priority || existing.priority || 'Normal';
  const requestedType = type ?? category;
  const nextType = CATEGORY_VALUES.includes(requestedType) ? requestedType : (existing.type || existing.category || 'Others');
  const nextAttachment = attachment ?? existing.attachment ?? null;
  const nextDueDate = due_date ?? dueDate ?? existing.due_date ?? existing.dueDate ?? null;

  if (!nextTitle || !nextDescription) {
    return res.status(400).json({ message: 'Title and description are required' });
  }

  await query(
    `UPDATE requests
     SET title = $1, description = $2, type = $3, priority = $4, category = $5, attachment = $6, "dueDate" = $7, due_date = $8, version = COALESCE(version, 1) + 1
     WHERE id = $9`,
    [nextTitle, nextDescription, nextType, nextPriority, nextType, nextAttachment, nextDueDate, nextDueDate, id]
  );

  await addAuditLog({ requestId: id, action: 'Updated', actorId: req.user.id, actorRole: req.user.role });
  return res.json({ message: 'Request updated successfully', requestId: id });
});

router.get('/:id/versions', authMiddleware, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const requestResult = await query('SELECT * FROM requests WHERE id = $1', [id]);
    const request = requestResult.rows[0];
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!canAccessRequest(request, req.user)) return res.status(403).json({ success: false, message: 'Forbidden' });

    const versionsResult = await query(
      `SELECT
         rv.id,
         rv.request_id,
         rv.version,
         rv.title,
         rv.description,
         rv.attachment_url,
         rv.updated_by,
         COALESCE(u.name, 'Unknown') AS updated_by_name,
         rv.updated_at
       FROM request_versions rv
       LEFT JOIN users u ON u.id = rv.updated_by
       WHERE rv.request_id = $1
       ORDER BY rv.version DESC, CAST(rv.updated_at AS TIMESTAMP) DESC`,
      [id]
    );

    return res.json({ success: true, data: versionsResult.rows });
  } catch (err) {
    console.error('GET REQUEST VERSIONS ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

const withdrawRequestHandler = async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });

  const existingResult = await query(
    'SELECT * FROM requests WHERE id = $1 AND COALESCE(created_by, "createdBy") = $2',
    [id, req.user.id]
  );
  const existing = existingResult.rows[0];
  if (!existing) return res.status(404).json({ message: 'Request not found' });

  const status = getRequestStatus(existing);
  if (status !== WORKFLOW_STATUS.PENDING || getRequestLevel(existing) !== ROLE_KEYS.TEAM_LEAD) {
    return res.status(400).json({ message: 'Cannot withdraw after Team Lead action' });
  }

  const now = new Date().toISOString();
  await query(
    `UPDATE requests
     SET status = $1,
         overall_status = $2,
         current_level = NULL,
         completed_at = $3,
         "actionBy" = $4,
         "actionDate" = $5
     WHERE id = $6`,
    [WORKFLOW_STATUS.WITHDRAWN, WORKFLOW_STATUS.WITHDRAWN, now, req.user.id, now, id]
  );
  await addAuditLog({ requestId: id, action: 'Withdrawn by Employee', actorId: req.user.id, actorRole: req.user.role });
  notifyRoleUsers(ROLE_KEYS.TEAM_LEAD, 'request_withdrawn', { requestId: id, title: existing.title }).catch((error) => {
    console.error('Notification dispatch failed:', error.message);
  });

  return res.json({
    success: true,
    message: 'Request withdrawn successfully',
    data: { id, status: WORKFLOW_STATUS.WITHDRAWN, current_level: null, completed_at: now },
  });
};

router.put('/:id/withdraw', authMiddleware, isEmployee, withdrawRequestHandler);
router.delete('/:id', authMiddleware, isEmployee, withdrawRequestHandler);

router.get('/all', authMiddleware, async (req, res) => {
  if (!hasRole(req.user.role, [ROLE_KEYS.TEAM_LEAD, ROLE_KEYS.MANAGER, ROLE_KEYS.ADMIN])) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  try {
    const result = await query(
      'SELECT * FROM requests ORDER BY CAST(COALESCE(created_at, "dateCreated") AS TIMESTAMP) DESC'
    );
    return res.json({ requests: result.rows.map(mapRequestRow) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/pending', authMiddleware, async (req, res) => {
  if (!hasRole(req.user.role, [ROLE_KEYS.TEAM_LEAD, ROLE_KEYS.MANAGER, ROLE_KEYS.ADMIN])) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const level = LEVEL_BY_ROLE[req.user.role];
  try {
    const result = await query(
      `SELECT *
       FROM requests
       WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) IN ('PENDING', 'ESCALATED')
         AND (current_level = $1 OR UPPER(REPLACE(COALESCE(CAST(current_level AS TEXT), ''), ' ', '_')) = $2)
       ORDER BY CAST(COALESCE(created_at, "dateCreated") AS TIMESTAMP) DESC`,
      [level || -1, req.user.role]
    );

    return res.json({ requests: result.rows.map(mapRequestRow) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/dashboard/counts', authMiddleware, async (req, res) => {
  if (!hasRole(req.user.role, [ROLE_KEYS.TEAM_LEAD, ROLE_KEYS.MANAGER, ROLE_KEYS.ADMIN])) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const result = await query(
      `SELECT
        COUNT(*) AS total,
        COUNT(CASE WHEN UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) IN ('PENDING', 'ESCALATED') THEN 1 END) AS pending,
        COUNT(CASE WHEN UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'FULLY_APPROVED' THEN 1 END) AS approved,
        COUNT(CASE WHEN UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'REJECTED' THEN 1 END) AS rejected
       FROM requests`
    );

    return res.json({ counts: result.rows[0] });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid request id' });

  const requestResult = await query(
    `SELECT
       r.*,
       COALESCE(r.created_by, r."createdBy") AS employee_id,
       COALESCE(r.created_at, r."dateCreated") AS created_at,
       COALESCE(u.name, 'Unknown') AS employee_name,
       COALESCE(u.email, '') AS employee_email,
       COALESCE(u.department, 'General') AS employee_department
     FROM requests r
     LEFT JOIN users u ON u.id = COALESCE(r.created_by, r."createdBy")
     WHERE r.id = $1`,
    [id]
  );
  const request = requestResult.rows[0];

  console.log('User:', req.user);
  console.log('Request:', request);

  if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
  if (!canAccessRequest(request, req.user)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  const approvalRowsResult = await query(
    `SELECT
       COALESCE(ra.level_name, al.role_name) AS role,
       UPPER(COALESCE(ra.action, ra.status, 'PENDING')) AS status,
       ra.approved_by AS approved_by,
       COALESCE(approver.name, '') AS approved_by_name,
       ra.comment,
       ra.timestamp
     FROM request_approvals ra
     LEFT JOIN approval_levels al ON al.id = ra.approval_level_id
     LEFT JOIN users approver ON approver.id = ra.approved_by
     WHERE ra.request_id = $1
     ORDER BY CAST(COALESCE(ra.timestamp, '1970-01-01T00:00:00.000Z') AS TIMESTAMP) ASC, ra.id ASC`,
    [id]
  );
  const approvalRows = approvalRowsResult.rows;

  const workflowRoles = [ROLE_KEYS.TEAM_LEAD, ROLE_KEYS.MANAGER];
  const latestByRole = new Map();
  approvalRows.forEach((row) => {
    const normalized = normalizeRole(row.role);
    if (normalized) latestByRole.set(normalized, row);
  });

  const requestLevel = getRequestLevel(request);
  const requestStatus = getRequestStatus(request);
  const approvals = workflowRoles.map((role) => {
    const row = latestByRole.get(role);
    if (row) {
      return {
        role,
        status: row.status,
        approved_by: row.approved_by_name || null,
        approved_by_id: row.approved_by,
        approved_by_name: row.approved_by_name || null,
        comment: row.comment || null,
        timestamp: row.timestamp || null,
      };
    }
    if (requestStatus === WORKFLOW_STATUS.FULLY_APPROVED) {
      return { role, status: 'APPROVED', approved_by: null, approved_by_name: null, comment: null, timestamp: null };
    }
    if (requestStatus === WORKFLOW_STATUS.REJECTED) {
      return { role, status: 'REJECTED', approved_by: null, approved_by_name: null, comment: null, timestamp: null };
    }
    if (requestLevel === role) {
      return { role, status: 'PENDING', approved_by: null, approved_by_name: null, comment: null, timestamp: null };
    }
    return { role, status: 'WAITING', approved_by: null, approved_by_name: null, comment: null, timestamp: null };
  });

  const auditLogsResult = await query(
    `SELECT
       a.id,
       a.action,
       a."actorId" AS user_id,
       COALESCE(u.name, 'Unknown') AS user_name,
       a."actorRole" AS user_role,
       a.comment,
       a."createdAt" AS timestamp
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a."actorId"
     WHERE a."requestId" = $1
     ORDER BY CAST(a."createdAt" AS TIMESTAMP) ASC, a.id ASC`,
    [id]
  );
  const auditLogs = auditLogsResult.rows;

  return res.json({
    success: true,
    data: {
      id: request.id,
      title: request.title,
      description: request.description,
      priority: request.priority || null,
      change_type: request.category || null,
      impact: request.comment || null,
      status: requestStatus,
      current_level: requestLevel || null,
      due_date: request.due_date || request.dueDate || null,
      deadline_status: getDeadlineStatus(request.due_date || request.dueDate || null),
      created_at: request.created_at || null,
      employee_id: request.employee_id || null,
      employee_name: request.employee_name,
      employee_email: request.employee_email,
      employee_department: request.employee_department,
      approvals,
      audit_logs: auditLogs,
    },
  });
});

router.get('/:id/approval-status', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });
  const result = await buildApprovalStatus(id, req.user);
  if (result.error) return res.status(result.error.code).json({ message: result.error.message });
  return res.json(result);
});

// Backward compatible alias for existing frontend.
router.get('/:id/approval-flow', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });
  const result = await buildApprovalStatus(id, req.user);
  if (result.error) return res.status(result.error.code).json({ message: result.error.message });
  return res.json(result);
});

router.post('/:id/approve', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const { comment } = req.body || {};
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });
  const result = await processApprovalAction({ requestId: id, actor: req.user, action: 'approve', comment });
  if (result.error) return res.status(result.error.code).json({ message: result.error.message });
  return res.json({
    success: true,
    message: result.message,
    data: {
      id,
      status: result.status,
      current_level: result.current_level,
      completed_at: result.completed_at,
    },
  });
});

router.post('/:id/reject', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const { comment } = req.body || {};
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });
  const result = await processApprovalAction({ requestId: id, actor: req.user, action: 'reject', comment });
  if (result.error) return res.status(result.error.code).json({ message: result.error.message });
  return res.json({
    success: true,
    message: result.message,
    data: {
      id,
      status: result.status,
      current_level: result.current_level,
      completed_at: result.completed_at,
    },
  });
});

// Backward compatibility with older frontend verbs/routes.
router.put('/:id/approve', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const { comment } = req.body || {};
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });
  const result = await processApprovalAction({ requestId: id, actor: req.user, action: 'approve', comment });
  if (result.error) return res.status(result.error.code).json({ message: result.error.message });
  return res.json({
    success: true,
    message: result.message,
    data: {
      id,
      status: result.status,
      current_level: result.current_level,
      completed_at: result.completed_at,
    },
  });
});

router.put('/:id/reject', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const { comment } = req.body || {};
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });
  const result = await processApprovalAction({ requestId: id, actor: req.user, action: 'reject', comment });
  if (result.error) return res.status(result.error.code).json({ message: result.error.message });
  return res.json({
    success: true,
    message: result.message,
    data: {
      id,
      status: result.status,
      current_level: result.current_level,
      completed_at: result.completed_at,
    },
  });
});

// Only Admin can reopen rejected request.
router.post('/:id/reopen', authMiddleware, isAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });

  const requestResult = await query('SELECT * FROM requests WHERE id = $1', [id]);
  const request = requestResult.rows[0];
  if (!request) return res.status(404).json({ message: 'Request not found' });
  if (getRequestStatus(request) !== WORKFLOW_STATUS.REJECTED) {
    return res.status(400).json({ message: 'Only rejected requests can be reopened' });
  }

  await query('DELETE FROM request_approvals WHERE request_id = $1', [id]);
  await query(
    `UPDATE requests
     SET status = $1, overall_status = $2, current_level = $3, completed_at = NULL,
         comment = NULL, "actionBy" = $4, "actionDate" = $5
     WHERE id = $6`,
    [WORKFLOW_STATUS.PENDING, WORKFLOW_STATUS.PENDING, LEVEL_BY_ROLE[ROLE_KEYS.TEAM_LEAD], req.user.id, new Date().toISOString(), id]
  );

  await addAuditLog({ requestId: id, action: 'Reopened by Admin', actorId: req.user.id, actorRole: req.user.role });
  notifyRoleUsers(ROLE_KEYS.TEAM_LEAD, 'request_next_level', { requestId: id, title: request.title, nextRole: ROLE_KEYS.TEAM_LEAD }).catch((error) => {
    console.error('Notification dispatch failed:', error.message);
  });

  return res.json({ message: 'Request reopened and moved to Team Lead', requestId: id });
});

router.post('/:id/comment', authMiddleware, async (req, res) => {
  if (!hasRole(req.user.role, [ROLE_KEYS.TEAM_LEAD, ROLE_KEYS.MANAGER, ROLE_KEYS.ADMIN])) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const id = Number(req.params.id);
  const { comment } = req.body;
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });
  if (!comment || !String(comment).trim()) return res.status(400).json({ message: 'Comment is required' });

  const requestResult = await query('SELECT id, title, "createdBy", created_by, status FROM requests WHERE id = $1', [id]);
  const request = requestResult.rows[0];
  if (!request) return res.status(404).json({ message: 'Request not found' });
  if (getRequestStatus(request) !== WORKFLOW_STATUS.PENDING) return res.status(400).json({ message: 'Comments can only be added to pending requests' });

  const trimmedComment = String(comment).trim();
  await query(
    'UPDATE requests SET comment = $1, "actionBy" = $2, "actionDate" = $3 WHERE id = $4',
    [trimmedComment, req.user.id, new Date().toISOString(), id]
  );

  await addAuditLog({
    requestId: id,
    action: 'Commented',
    actorId: req.user.id,
    actorRole: req.user.role,
    comment: trimmedComment,
  });

  notifyUser(getRequestCreatorId(request), 'request_commented', {
    requestId: id,
    title: request.title,
    comment: trimmedComment,
    actionBy: req.user.id,
  });

  return res.json({ message: 'Comment added', requestId: id });
});

router.get('/:id/activity', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });

  const requestResult = await query('SELECT id, "createdBy", created_by FROM requests WHERE id = $1', [id]);
  const request = requestResult.rows[0];
  if (!request) return res.status(404).json({ message: 'Request not found' });
  if (!canAccessRequest(request, req.user)) return res.status(403).json({ message: 'Forbidden' });

  const activityResult = await query(
    `SELECT
       a.id,
       a."requestId" AS "requestId",
       a.action AS "actionType",
       a."actorId" AS "userId",
       COALESCE(u.name, 'Unknown User') AS "userName",
       a."actorRole" AS "userRole",
       a.comment AS comment,
       a."createdAt" AS timestamp
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a."actorId"
     WHERE a."requestId" = $1
     ORDER BY CAST(a."createdAt" AS TIMESTAMP) ASC, a.id ASC`,
    [id]
  );

  return res.json({ activity: activityResult.rows });
});

router.post('/:id/activity', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  const { actionType, comment } = req.body || {};
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });
  if (!actionType || !String(actionType).trim()) return res.status(400).json({ message: 'actionType is required' });

  const requestResult = await query('SELECT id, "createdBy", created_by, title FROM requests WHERE id = $1', [id]);
  const request = requestResult.rows[0];
  if (!request) return res.status(404).json({ message: 'Request not found' });
  if (!canAccessRequest(request, req.user)) return res.status(403).json({ message: 'Forbidden' });

  const finalAction = String(actionType).trim().slice(0, 64);
  const finalComment = comment ? String(comment).trim().slice(0, 1000) : null;

  await addAuditLog({ requestId: id, action: finalAction, actorId: req.user.id, actorRole: req.user.role, comment: finalComment });

  if (finalAction.toLowerCase() === 'commented' && req.user.id !== getRequestCreatorId(request)) {
    notifyUser(getRequestCreatorId(request), 'request_commented', {
      requestId: id,
      title: request.title,
      comment: finalComment,
      actionBy: req.user.id,
    });
  }

  return res.status(201).json({ message: 'Activity logged', requestId: id, actionType: finalAction });
});

router.get('/:id/audit', authMiddleware, async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });

  const requestResult = await query('SELECT id, "createdBy", created_by FROM requests WHERE id = $1', [id]);
  const request = requestResult.rows[0];
  if (!request) return res.status(404).json({ message: 'Request not found' });
  if (!canAccessRequest(request, req.user)) return res.status(403).json({ message: 'Forbidden' });

  const logsResult = await query(
    `SELECT id, "requestId" AS "requestId", action, "actorId" AS "actorId", "actorRole" AS "actorRole", comment, "createdAt" AS "createdAt"
     FROM audit_logs
     WHERE "requestId" = $1
     ORDER BY CAST("createdAt" AS TIMESTAMP) ASC, id ASC`,
    [id]
  );

  return res.json({ logs: logsResult.rows });
});

router.get('/report/csv/download', authMiddleware, async (req, res) => {
  if (!hasRole(req.user.role, [ROLE_KEYS.TEAM_LEAD, ROLE_KEYS.MANAGER, ROLE_KEYS.ADMIN])) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const rowsResult = await query(
    `SELECT
       id,
       title,
       description,
       status,
       current_level,
       COALESCE(created_by, "createdBy") AS created_by,
       priority,
       category,
       "dateCreated" AS "dateCreated",
       "dueDate" AS "dueDate",
       "actionBy" AS "actionBy",
       "actionDate" AS "actionDate",
       completed_at
     FROM requests
     ORDER BY CAST(COALESCE(created_at, "dateCreated") AS TIMESTAMP) DESC`
  );
  const rows = rowsResult.rows;

  const header = 'id,title,description,status,current_level,created_by,priority,category,dateCreated,dueDate,actionBy,actionDate,completed_at';
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const body = rows.map((row) => Object.values(row).map(escape).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="change_requests_report.csv"');
  return res.status(200).send(`${header}\n${body}`);
});

router.get('/audit/all/logs', authMiddleware, isAdmin, async (req, res) => {
  const logsResult = await query(
    `SELECT
       id,
       "requestId" AS "requestId",
       action,
       "actorId" AS "actorId",
       "actorRole" AS "actorRole",
       comment,
       "createdAt" AS "createdAt"
     FROM audit_logs
     ORDER BY CAST("createdAt" AS TIMESTAMP) DESC, id DESC
     LIMIT 300`
  );

  return res.json({ logs: logsResult.rows });
});

module.exports = router;

