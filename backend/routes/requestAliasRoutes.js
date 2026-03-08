const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { authorizeRole } = require('../middleware/roleMiddleware');
const { ROLE_KEYS } = require('../utils/roles');

const router = express.Router();

const redirect307 = (target) => (req, res) => res.redirect(307, target);

router.post('/requests', authMiddleware, authorizeRole(ROLE_KEYS.EMPLOYEE), redirect307('/api/requests/create'));
router.put('/requests/:id', authMiddleware, authorizeRole(ROLE_KEYS.EMPLOYEE), (req, res) =>
  res.redirect(307, `/api/requests/${req.params.id}`)
);
router.post('/requests/:id/approve', authMiddleware, (req, res) =>
  res.redirect(307, `/api/requests/${req.params.id}/approve`)
);
router.post('/requests/:id/reject', authMiddleware, (req, res) =>
  res.redirect(307, `/api/requests/${req.params.id}/reject`)
);

router.get('/my-requests', authMiddleware, authorizeRole(ROLE_KEYS.EMPLOYEE), redirect307('/api/requests/my'));
router.get('/team-requests', authMiddleware, authorizeRole(ROLE_KEYS.TEAM_LEAD), redirect307('/api/requests/pending'));
router.get('/manager-requests', authMiddleware, authorizeRole(ROLE_KEYS.MANAGER), redirect307('/api/requests/pending'));
router.get('/all-requests', authMiddleware, authorizeRole(ROLE_KEYS.ADMIN), redirect307('/api/requests/all'));

module.exports = router;
