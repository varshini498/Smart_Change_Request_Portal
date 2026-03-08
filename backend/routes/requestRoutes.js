const express = require('express');
const db = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { isEmployee, isAdmin } = require('../middleware/roleMiddleware');
const { ROLE_KEYS, normalizeRole, toDisplayRole, hasRole } = require('../utils/roles');
const notificationService = require('../services/notificationService');

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

const addAuditLog = ({ requestId, action, actorId, actorRole, comment = null }) => {
  db.prepare(
    `INSERT INTO audit_logs (requestId, action, actorId, actorRole, comment, createdAt)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(requestId, action, actorId, actorRole, comment, new Date().toISOString());
};

const saveRequestVersionSnapshot = ({ request, updatedBy }) => {
  if (!request?.id) return;
  const currentVersion = Number(request.version) > 0 ? Number(request.version) : 1;
  db.prepare(
    `INSERT INTO request_versions
     (request_id, version, title, description, attachment_url, updated_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    request.id,
    currentVersion,
    request.title || null,
    request.description || null,
    request.attachment || null,
    updatedBy || null,
    new Date().toISOString()
  );
};

const notifyRoleUsers = (roleName, templateKey, meta) => {
  const users = db.prepare('SELECT id, role FROM users').all()
    .filter((x) => hasRole(x.role, roleName))
    .map((x) => x.id);
  if (!users.length) return;
  notificationService.createBulkNotifications(users, templateKey, meta);
};

const notifyUser = (userId, templateKey, meta) => {
  if (!userId) return;
  notificationService.createBulkNotifications([userId], templateKey, meta);
};

const mapRequest = (request) => {
  const status = getRequestStatus(request);
  const dueDate = request.due_date || request.dueDate || null;
  return {
    ...request,
    createdBy: getRequestCreatorId(request),
    status,
    overall_status: request.overall_status || status,
    due_date: dueDate,
    dueDate: dueDate,
    deadline_status: getDeadlineStatus(dueDate),
    isOverdue: checkIfOverdue(dueDate, status),
  };
};

const canAccessRequest = (request, user) =>
  hasRole(user.role, [ROLE_KEYS.ADMIN, ROLE_KEYS.MANAGER, ROLE_KEYS.TEAM_LEAD]) ||
  (hasRole(user.role, ROLE_KEYS.EMPLOYEE) && getRequestCreatorId(request) === user.id);

const getApprovalLevelId = (levelName) => {
  const row = db
    .prepare('SELECT id, role_name AS roleName FROM approval_levels WHERE is_active = 1 ORDER BY level_number ASC')
    .all()
    .find((x) => normalizeRole(x.roleName) === normalizeRole(levelName));
  return row?.id || null;
};

const buildApprovalStatus = (requestId, user) => {
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);
  if (!request) return { error: { code: 404, message: 'Request not found' } };
  if (!canAccessRequest(request, user)) return { error: { code: 403, message: 'Forbidden' } };

  const creatorId = getRequestCreatorId(request);
  const creator = db.prepare('SELECT id, name, role FROM users WHERE id = ?').get(creatorId);

  const actionRows = db
    .prepare(
      `SELECT
         ra.id,
         COALESCE(ra.level_name, al.role_name) AS levelName,
         COALESCE(ra.action, ra.status) AS action,
         ra.comment,
         ra.timestamp,
         ra.approved_by AS approvedBy,
         COALESCE(u.name, 'Unknown User') AS approverName
       FROM request_approvals ra
       LEFT JOIN approval_levels al ON al.id = ra.approval_level_id
       LEFT JOIN users u ON u.id = ra.approved_by
       WHERE ra.request_id = ?
       ORDER BY datetime(COALESCE(ra.timestamp, '1970-01-01T00:00:00.000Z')) ASC, ra.id ASC`
    )
    .all(requestId);

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

const insertApprovalAction = ({ requestId, levelName, approvedBy, action, comment, timestamp }) => {
  const approvalLevelId = getApprovalLevelId(levelName);
  db.prepare(
    `INSERT INTO request_approvals (request_id, approval_level_id, level_name, approved_by, status, action, comment, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    requestId,
    approvalLevelId || -1,
    levelName,
    approvedBy,
    action,
    action,
    comment,
    timestamp
  );
};

const processApprovalAction = ({ requestId, actor, action, comment }) => {
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);
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
    insertApprovalAction({
      requestId,
      levelName: currentLevel,
      approvedBy: actor.id,
      action: WORKFLOW_STATUS.REJECTED,
      comment: trimmed,
      timestamp: now,
    });

    db.prepare(
      `UPDATE requests
       SET status = ?,
           overall_status = ?,
           current_level = NULL,
           completed_at = ?,
           comment = ?,
           actionBy = ?,
           actionDate = ?
       WHERE id = ?`
    ).run(
      WORKFLOW_STATUS.REJECTED,
      WORKFLOW_STATUS.REJECTED,
      now,
      trimmed,
      actor.id,
      now,
      requestId
    );

    addAuditLog({
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

  insertApprovalAction({
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
    db.prepare(
      `UPDATE requests
       SET status = ?,
           overall_status = ?,
           current_level = ?,
           completed_at = NULL,
           comment = ?,
           actionBy = ?,
           actionDate = ?
       WHERE id = ?`
    ).run(WORKFLOW_STATUS.PENDING, WORKFLOW_STATUS.PENDING, LEVEL_BY_ROLE[nextLevel], trimmed, actor.id, now, requestId);

    addAuditLog({
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

  db.prepare(
    `UPDATE requests
     SET status = ?,
         overall_status = ?,
         current_level = NULL,
         completed_at = ?,
         comment = ?,
         actionBy = ?,
         actionDate = ?
     WHERE id = ?`
  ).run(WORKFLOW_STATUS.FULLY_APPROVED, WORKFLOW_STATUS.FULLY_APPROVED, now, trimmed, actor.id, now, requestId);

  addAuditLog({
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

const REQUEST_COLUMNS = new Set(
  db.prepare("PRAGMA table_info(requests);").all().map((col) => col.name)
);

const resolveRequestColumn = (preferred, fallback) => {
  if (REQUEST_COLUMNS.has(preferred)) return preferred;
  if (fallback && REQUEST_COLUMNS.has(fallback)) return fallback;
  return null;
};

const createRequestHandler = (req, res) => {
  try {
    const { title, description, dueDate, due_date } = req.body || {};
    const safeTitle = String(title || '').trim();
    const safeDescription = String(description || '').trim();

    if (!safeTitle || !safeDescription) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required',
      });
    }

    const hasCreatedBy = REQUEST_COLUMNS.has('createdBy');
    const hasCreatedBySnake = REQUEST_COLUMNS.has('created_by');
    const createdByColumn = resolveRequestColumn('created_by', 'createdBy');
    const hasCreatedAt = REQUEST_COLUMNS.has('created_at');
    const hasCreatedAtLegacy = REQUEST_COLUMNS.has('dateCreated');
    const createdAtColumn = resolveRequestColumn('created_at', 'dateCreated');
    const requiredMissing = [];
    if (!REQUEST_COLUMNS.has('title')) requiredMissing.push('title');
    if (!REQUEST_COLUMNS.has('description')) requiredMissing.push('description');
    if (!REQUEST_COLUMNS.has('status')) requiredMissing.push('status');
    if (!REQUEST_COLUMNS.has('current_level')) requiredMissing.push('current_level');
    if (!createdByColumn) requiredMissing.push('created_by');
    if (!createdAtColumn) requiredMissing.push('created_at');

    if (requiredMissing.length) {
      return res.status(500).json({
        success: false,
        message: `Missing required columns in requests table: ${requiredMissing.join(', ')}`,
      });
    }

    const createdAt = new Date().toISOString();
    const insertColumns = ['title', 'description'];

    if (hasCreatedBySnake) insertColumns.push('created_by');
    if (hasCreatedBy && !insertColumns.includes('createdBy')) insertColumns.push('createdBy');

    insertColumns.push('status', 'current_level');

    const finalDueDate = due_date || dueDate || null;
    const hasDueDateSnake = REQUEST_COLUMNS.has('due_date');
    const hasDueDateLegacy = REQUEST_COLUMNS.has('dueDate');
    if (hasDueDateSnake) insertColumns.push('due_date');
    if (hasDueDateLegacy && !insertColumns.includes('dueDate')) insertColumns.push('dueDate');

    if (hasCreatedAt) insertColumns.push('created_at');
    if (hasCreatedAtLegacy && !insertColumns.includes('dateCreated')) insertColumns.push('dateCreated');
    if (REQUEST_COLUMNS.has('submitted_at')) insertColumns.push('submitted_at');
    if (REQUEST_COLUMNS.has('version')) insertColumns.push('version');
    const placeholders = insertColumns.map(() => '?').join(', ');

    const stmt = db.prepare(
      `INSERT INTO requests (${insertColumns.join(', ')}) VALUES (${placeholders})`
    );

    const values = [safeTitle, safeDescription];

    if (hasCreatedBySnake) values.push(req.user.id);
    if (hasCreatedBy) values.push(req.user.id);

    values.push(WORKFLOW_STATUS.PENDING, 1);

    if (hasDueDateSnake) values.push(finalDueDate);
    if (hasDueDateLegacy) values.push(finalDueDate);

    if (hasCreatedAt) values.push(createdAt);
    if (hasCreatedAtLegacy) values.push(createdAt);
    if (REQUEST_COLUMNS.has('submitted_at')) values.push(createdAt);
    if (REQUEST_COLUMNS.has('version')) values.push(1);

    const info = stmt.run(...values);

    const inserted = db
      .prepare(
        `SELECT id, status, current_level, ${createdAtColumn} AS created_at, COALESCE(due_date, dueDate) AS due_date
         FROM requests
         WHERE id = ?`
      )
      .get(info.lastInsertRowid);

    console.log('[REQUEST CREATED]:', inserted);

    addAuditLog({
      requestId: info.lastInsertRowid,
      action: 'Created',
      actorId: req.user.id,
      actorRole: req.user.role,
    });

    notifyRoleUsers(ROLE_KEYS.TEAM_LEAD, 'request_created', {
      requestId: info.lastInsertRowid,
      title: safeTitle,
      createdBy: req.user.id,
      currentLevel: ROLE_KEYS.TEAM_LEAD,
    });

    notifyUser(req.user.id, 'request_submitted', {
      requestId: info.lastInsertRowid,
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

router.post('/draft', authMiddleware, isEmployee, (req, res) => {
  try {
    const payload = req.body || {};
    const title = String(payload.title || '').trim();
    const description = String(payload.description || '').trim();
    const priority = String(payload.priority || 'Medium').trim();
    const category = String(payload.category || payload.changeType || 'Others').trim();
    const attachment = payload.attachment ?? null;
    const nextDueDate = payload.due_date ?? payload.dueDate ?? payload.implementationDate ?? null;
    const now = new Date().toISOString();

    const stmt = db.prepare(
      `INSERT INTO requests
       (title, description, created_by, createdBy, status, overall_status, current_level, priority, category, attachment, due_date, dueDate, created_at, dateCreated, version)
       VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const info = stmt.run(
      title || 'Untitled Draft',
      description || '',
      req.user.id,
      req.user.id,
      WORKFLOW_STATUS.DRAFT,
      WORKFLOW_STATUS.DRAFT,
      priority || 'Medium',
      category || 'Others',
      attachment,
      nextDueDate,
      nextDueDate,
      now,
      now,
      1
    );

    addAuditLog({
      requestId: info.lastInsertRowid,
      action: 'Draft saved',
      actorId: req.user.id,
      actorRole: req.user.role,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: info.lastInsertRowid,
        status: WORKFLOW_STATUS.DRAFT,
        current_level: null,
      },
    });
  } catch (err) {
    console.error('CREATE DRAFT ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:id/draft', authMiddleware, isEmployee, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const existing = db.prepare('SELECT * FROM requests WHERE id = ? AND COALESCE(created_by, createdBy) = ?').get(id, req.user.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Draft not found' });
    if (getRequestStatus(existing) !== WORKFLOW_STATUS.DRAFT) {
      return res.status(400).json({ success: false, message: 'Only draft requests can be updated here' });
    }

    saveRequestVersionSnapshot({ request: existing, updatedBy: req.user.id });

    const payload = req.body || {};
    const nextTitle = String(payload.title ?? existing.title ?? '').trim();
    const nextDescription = String(payload.description ?? existing.description ?? '').trim();
    const nextPriority = String(payload.priority ?? existing.priority ?? 'Medium').trim();
    const nextCategory = String(payload.category ?? payload.changeType ?? existing.category ?? 'Others').trim();
    const nextAttachment = payload.attachment ?? existing.attachment ?? null;
    const nextDueDate = payload.due_date ?? payload.dueDate ?? payload.implementationDate ?? existing.due_date ?? existing.dueDate ?? null;

    db.prepare(
      `UPDATE requests
       SET title = ?, description = ?, priority = ?, category = ?, attachment = ?, due_date = ?, dueDate = ?, version = COALESCE(version, 1) + 1
       WHERE id = ?`
    ).run(nextTitle || 'Untitled Draft', nextDescription || '', nextPriority, nextCategory, nextAttachment, nextDueDate, nextDueDate, id);

    addAuditLog({
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

router.put('/:id/submit', authMiddleware, isEmployee, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const existing = db.prepare('SELECT * FROM requests WHERE id = ? AND COALESCE(created_by, createdBy) = ?').get(id, req.user.id);
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

    const now = new Date().toISOString();
    db.prepare(
      `UPDATE requests
       SET status = ?, overall_status = ?, current_level = ?, submitted_at = ?, completed_at = NULL
       WHERE id = ?`
    ).run(WORKFLOW_STATUS.PENDING, WORKFLOW_STATUS.PENDING, LEVEL_BY_ROLE[ROLE_KEYS.TEAM_LEAD], now, id);

    addAuditLog({
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
    });

    notifyUser(req.user.id, 'request_submitted', {
      requestId: id,
      title: existing.title,
    });

    return res.json({
      success: true,
      message: 'Request submitted for approval',
      data: { id, status: WORKFLOW_STATUS.PENDING, current_level: LEVEL_BY_ROLE[ROLE_KEYS.TEAM_LEAD], submitted_at: now },
    });
  } catch (err) {
    console.error('SUBMIT DRAFT ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/:id/draft', authMiddleware, isEmployee, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const existing = db.prepare('SELECT * FROM requests WHERE id = ? AND COALESCE(created_by, createdBy) = ?').get(id, req.user.id);
    if (!existing) return res.status(404).json({ success: false, message: 'Draft not found' });
    if (getRequestStatus(existing) !== WORKFLOW_STATUS.DRAFT) {
      return res.status(400).json({ success: false, message: 'Only drafts can be deleted' });
    }

    db.prepare('DELETE FROM request_versions WHERE request_id = ?').run(id);
    db.prepare('DELETE FROM requests WHERE id = ?').run(id);

    addAuditLog({
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

router.get('/categories', authMiddleware, (req, res) => {
  const categories = db.prepare('SELECT id, name FROM categories ORDER BY name ASC').all();
  return res.json({ success: true, data: categories });
});

router.get('/my', authMiddleware, isEmployee, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM requests WHERE COALESCE(created_by, createdBy) = ? ORDER BY dateCreated DESC')
    .all(req.user.id)
    .map(mapRequest);
  return res.json({ requests: rows });
});

// Employee can edit only before Team Lead approves (locked after Level 1).
router.put('/:id', authMiddleware, isEmployee, (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });

  const existing = db.prepare('SELECT * FROM requests WHERE id = ? AND COALESCE(created_by, createdBy) = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json({ message: 'Request not found' });

  if (getRequestStatus(existing) !== WORKFLOW_STATUS.PENDING || getRequestLevel(existing) !== ROLE_KEYS.TEAM_LEAD) {
    return res.status(400).json({ message: 'Request is locked after Level 1 approval' });
  }

  saveRequestVersionSnapshot({ request: existing, updatedBy: req.user.id });

  const { title, description, priority, dueDate, due_date, category, attachment } = req.body || {};
  const nextTitle = String(title || existing.title).trim();
  const nextDescription = String(description || existing.description).trim();
  const nextPriority = priority || existing.priority || 'Normal';
  const nextCategory = CATEGORY_VALUES.includes(category) ? category : (existing.category || 'Others');
  const nextAttachment = attachment ?? existing.attachment ?? null;
  const nextDueDate = due_date ?? dueDate ?? existing.due_date ?? existing.dueDate ?? null;

  if (!nextTitle || !nextDescription) {
    return res.status(400).json({ message: 'Title and description are required' });
  }

  db.prepare(
    `UPDATE requests
     SET title = ?, description = ?, priority = ?, category = ?, attachment = ?, dueDate = ?, due_date = ?, version = COALESCE(version, 1) + 1
     WHERE id = ?`
  ).run(nextTitle, nextDescription, nextPriority, nextCategory, nextAttachment, nextDueDate, nextDueDate, id);

  addAuditLog({ requestId: id, action: 'Updated', actorId: req.user.id, actorRole: req.user.role });
  return res.json({ message: 'Request updated successfully', requestId: id });
});

router.get('/:id/versions', authMiddleware, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid request id' });

    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
    if (!canAccessRequest(request, req.user)) return res.status(403).json({ success: false, message: 'Forbidden' });

    const versions = db
      .prepare(
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
         WHERE rv.request_id = ?
         ORDER BY rv.version DESC, datetime(rv.updated_at) DESC`
      )
      .all(id);

    return res.json({ success: true, data: versions });
  } catch (err) {
    console.error('GET REQUEST VERSIONS ERROR:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

const withdrawRequestHandler = (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });

  const existing = db.prepare('SELECT * FROM requests WHERE id = ? AND COALESCE(created_by, createdBy) = ?').get(id, req.user.id);
  if (!existing) return res.status(404).json({ message: 'Request not found' });

  const status = getRequestStatus(existing);
  if (status !== WORKFLOW_STATUS.PENDING || getRequestLevel(existing) !== ROLE_KEYS.TEAM_LEAD) {
    return res.status(400).json({ message: 'Cannot withdraw after Team Lead action' });
  }

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE requests
     SET status = ?,
         overall_status = ?,
         current_level = NULL,
         completed_at = ?,
         actionBy = ?,
         actionDate = ?
     WHERE id = ?`
  ).run(WORKFLOW_STATUS.WITHDRAWN, WORKFLOW_STATUS.WITHDRAWN, now, req.user.id, now, id);
  addAuditLog({ requestId: id, action: 'Withdrawn by Employee', actorId: req.user.id, actorRole: req.user.role });
  notifyRoleUsers(ROLE_KEYS.TEAM_LEAD, 'request_withdrawn', { requestId: id, title: existing.title });

  return res.json({
    success: true,
    message: 'Request withdrawn successfully',
    data: { id, status: WORKFLOW_STATUS.WITHDRAWN, current_level: null, completed_at: now },
  });
};

router.put('/:id/withdraw', authMiddleware, isEmployee, withdrawRequestHandler);
router.delete('/:id', authMiddleware, isEmployee, withdrawRequestHandler);

router.get('/all', authMiddleware, (req, res) => {
  if (!hasRole(req.user.role, [ROLE_KEYS.TEAM_LEAD, ROLE_KEYS.MANAGER, ROLE_KEYS.ADMIN])) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const rows = db.prepare('SELECT * FROM requests ORDER BY dateCreated DESC').all().map(mapRequest);
  return res.json({ requests: rows });
});

router.get('/pending', authMiddleware, (req, res) => {
  if (!hasRole(req.user.role, [ROLE_KEYS.TEAM_LEAD, ROLE_KEYS.MANAGER, ROLE_KEYS.ADMIN])) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const level = LEVEL_BY_ROLE[req.user.role];
  const rows = db
    .prepare(
      `SELECT *
       FROM requests
       WHERE UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) IN ('PENDING', 'ESCALATED')
         AND (current_level = ? OR UPPER(REPLACE(COALESCE(current_level, ''), ' ', '_')) = ?)
       ORDER BY dateCreated DESC`
    )
    .all(level || -1, req.user.role)
    .map(mapRequest);

  return res.json({ requests: rows });
});

router.get('/dashboard/counts', authMiddleware, (req, res) => {
  if (!hasRole(req.user.role, [ROLE_KEYS.TEAM_LEAD, ROLE_KEYS.MANAGER, ROLE_KEYS.ADMIN])) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const counts = db.prepare(
    `SELECT
      COUNT(*) AS total,
      COUNT(CASE WHEN UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) IN ('PENDING', 'ESCALATED') THEN 1 END) AS pending,
      COUNT(CASE WHEN UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'FULLY_APPROVED' THEN 1 END) AS approved,
      COUNT(CASE WHEN UPPER(REPLACE(COALESCE(status, ''), ' ', '_')) = 'REJECTED' THEN 1 END) AS rejected
     FROM requests`
  ).get();

  return res.json({ counts });
});

router.get('/:id', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid request id' });

  const request = db
    .prepare(
      `SELECT
         r.*,
         COALESCE(r.created_by, r.createdBy) AS employee_id,
         COALESCE(r.created_at, r.dateCreated) AS created_at,
         COALESCE(u.name, 'Unknown') AS employee_name,
         COALESCE(u.email, '') AS employee_email,
         COALESCE(u.department, 'General') AS employee_department
       FROM requests r
       LEFT JOIN users u ON u.id = COALESCE(r.created_by, r.createdBy)
       WHERE r.id = ?`
    )
    .get(id);

  if (!request) return res.status(404).json({ success: false, message: 'Request not found' });
  if (!canAccessRequest(request, req.user)) return res.status(403).json({ success: false, message: 'Forbidden' });

  const approvalRows = db
    .prepare(
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
       WHERE ra.request_id = ?
       ORDER BY datetime(COALESCE(ra.timestamp, '1970-01-01T00:00:00.000Z')) ASC, ra.id ASC`
    )
    .all(id);

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

  const auditLogs = db
    .prepare(
      `SELECT
         a.id,
         a.action,
         a.actorId AS user_id,
         COALESCE(u.name, 'Unknown') AS user_name,
         a.actorRole AS user_role,
         a.comment,
         a.createdAt AS timestamp
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actorId
       WHERE a.requestId = ?
       ORDER BY datetime(a.createdAt) ASC, a.id ASC`
    )
    .all(id);

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

router.get('/:id/approval-status', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });
  const result = buildApprovalStatus(id, req.user);
  if (result.error) return res.status(result.error.code).json({ message: result.error.message });
  return res.json(result);
});

// Backward compatible alias for existing frontend.
router.get('/:id/approval-flow', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });
  const result = buildApprovalStatus(id, req.user);
  if (result.error) return res.status(result.error.code).json({ message: result.error.message });
  return res.json(result);
});

router.post('/:id/approve', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const { comment } = req.body || {};
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });
  const result = processApprovalAction({ requestId: id, actor: req.user, action: 'approve', comment });
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

router.post('/:id/reject', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const { comment } = req.body || {};
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });
  const result = processApprovalAction({ requestId: id, actor: req.user, action: 'reject', comment });
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
router.put('/:id/approve', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const { comment } = req.body || {};
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });
  const result = processApprovalAction({ requestId: id, actor: req.user, action: 'approve', comment });
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

router.put('/:id/reject', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const { comment } = req.body || {};
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });
  const result = processApprovalAction({ requestId: id, actor: req.user, action: 'reject', comment });
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
router.post('/:id/reopen', authMiddleware, isAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });

  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
  if (!request) return res.status(404).json({ message: 'Request not found' });
  if (getRequestStatus(request) !== WORKFLOW_STATUS.REJECTED) {
    return res.status(400).json({ message: 'Only rejected requests can be reopened' });
  }

  db.prepare('DELETE FROM request_approvals WHERE request_id = ?').run(id);
  db.prepare(
    `UPDATE requests
     SET status = ?, overall_status = ?, current_level = ?, completed_at = NULL,
         comment = NULL, actionBy = ?, actionDate = ?
     WHERE id = ?`
  ).run(WORKFLOW_STATUS.PENDING, WORKFLOW_STATUS.PENDING, LEVEL_BY_ROLE[ROLE_KEYS.TEAM_LEAD], req.user.id, new Date().toISOString(), id);

  addAuditLog({ requestId: id, action: 'Reopened by Admin', actorId: req.user.id, actorRole: req.user.role });
  notifyRoleUsers(ROLE_KEYS.TEAM_LEAD, 'request_next_level', { requestId: id, title: request.title, nextRole: ROLE_KEYS.TEAM_LEAD });

  return res.json({ message: 'Request reopened and moved to Team Lead', requestId: id });
});

router.post('/:id/comment', authMiddleware, (req, res) => {
  if (!hasRole(req.user.role, [ROLE_KEYS.TEAM_LEAD, ROLE_KEYS.MANAGER, ROLE_KEYS.ADMIN])) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const id = Number(req.params.id);
  const { comment } = req.body;
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });
  if (!comment || !String(comment).trim()) return res.status(400).json({ message: 'Comment is required' });

  const request = db.prepare('SELECT id, title, createdBy, created_by, status FROM requests WHERE id = ?').get(id);
  if (!request) return res.status(404).json({ message: 'Request not found' });
  if (getRequestStatus(request) !== WORKFLOW_STATUS.PENDING) return res.status(400).json({ message: 'Comments can only be added to pending requests' });

  const trimmedComment = String(comment).trim();
  db.prepare(`UPDATE requests SET comment = ?, actionBy = ?, actionDate = ? WHERE id = ?`)
    .run(trimmedComment, req.user.id, new Date().toISOString(), id);

  addAuditLog({
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

router.get('/:id/activity', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });

  const request = db.prepare('SELECT id, createdBy, created_by FROM requests WHERE id = ?').get(id);
  if (!request) return res.status(404).json({ message: 'Request not found' });
  if (!canAccessRequest(request, req.user)) return res.status(403).json({ message: 'Forbidden' });

  const activity = db
    .prepare(
      `SELECT
         a.id,
         a.requestId AS requestId,
         a.action AS actionType,
         a.actorId AS userId,
         COALESCE(u.name, 'Unknown User') AS userName,
         a.actorRole AS userRole,
         a.comment AS comment,
         a.createdAt AS timestamp
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actorId
       WHERE a.requestId = ?
       ORDER BY a.createdAt ASC`
    )
    .all(id);

  return res.json({ activity });
});

router.post('/:id/activity', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  const { actionType, comment } = req.body || {};
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });
  if (!actionType || !String(actionType).trim()) return res.status(400).json({ message: 'actionType is required' });

  const request = db.prepare('SELECT id, createdBy, created_by, title FROM requests WHERE id = ?').get(id);
  if (!request) return res.status(404).json({ message: 'Request not found' });
  if (!canAccessRequest(request, req.user)) return res.status(403).json({ message: 'Forbidden' });

  const finalAction = String(actionType).trim().slice(0, 64);
  const finalComment = comment ? String(comment).trim().slice(0, 1000) : null;

  addAuditLog({ requestId: id, action: finalAction, actorId: req.user.id, actorRole: req.user.role, comment: finalComment });

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

router.get('/:id/audit', authMiddleware, (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ message: 'Invalid request id' });

  const request = db.prepare('SELECT id, createdBy, created_by FROM requests WHERE id = ?').get(id);
  if (!request) return res.status(404).json({ message: 'Request not found' });
  if (!canAccessRequest(request, req.user)) return res.status(403).json({ message: 'Forbidden' });

  const logs = db
    .prepare(
      `SELECT id, requestId, action, actorId, actorRole, comment, createdAt
       FROM audit_logs
       WHERE requestId = ?
       ORDER BY createdAt ASC`
    )
    .all(id);

  return res.json({ logs });
});

router.get('/report/csv/download', authMiddleware, (req, res) => {
  if (!hasRole(req.user.role, [ROLE_KEYS.TEAM_LEAD, ROLE_KEYS.MANAGER, ROLE_KEYS.ADMIN])) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  const rows = db
    .prepare(
      `SELECT id, title, description, status, current_level, COALESCE(created_by, createdBy) AS created_by, priority, category, dateCreated, dueDate, actionBy, actionDate, completed_at
       FROM requests
       ORDER BY dateCreated DESC`
    )
    .all();

  const header = 'id,title,description,status,current_level,created_by,priority,category,dateCreated,dueDate,actionBy,actionDate,completed_at';
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const body = rows.map((row) => Object.values(row).map(escape).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="change_requests_report.csv"');
  return res.status(200).send(`${header}\n${body}`);
});

router.get('/audit/all/logs', authMiddleware, isAdmin, (req, res) => {
  const logs = db
    .prepare(
      `SELECT id, requestId, action, actorId, actorRole, comment, createdAt
       FROM audit_logs
       ORDER BY createdAt DESC
       LIMIT 300`
    )
    .all();

  return res.json({ logs });
});

module.exports = router;

