const db = require('../config/db');
const respond = require('../utils/respond');

exports.getCategories = (_req, res) => {
  try {
    const rows = db.prepare('SELECT id, name, created_at FROM categories ORDER BY name ASC').all();
    return respond(res, true, rows);
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.createCategory = (req, res) => {
  try {
    const { name } = req.body || {};
    const finalName = String(name || '').trim();
    if (!finalName) return respond(res, false, 'name is required', 400);
    const info = db.prepare('INSERT INTO categories (name, created_at) VALUES (?, ?)').run(finalName, new Date().toISOString());
    return respond(res, true, { id: info.lastInsertRowid, name: finalName }, 201);
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) {
      return respond(res, false, 'Category already exists', 400);
    }
    return respond(res, false, err.message, 500);
  }
};

exports.updateCategory = (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name } = req.body || {};
    const finalName = String(name || '').trim();
    if (Number.isNaN(id)) return respond(res, false, 'Invalid category id', 400);
    if (!finalName) return respond(res, false, 'name is required', 400);
    const info = db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(finalName, id);
    if (!info.changes) return respond(res, false, 'Category not found', 404);
    return respond(res, true, { id, name: finalName });
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE')) {
      return respond(res, false, 'Category already exists', 400);
    }
    return respond(res, false, err.message, 500);
  }
};

exports.deleteCategory = (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return respond(res, false, 'Invalid category id', 400);
    const info = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    if (!info.changes) return respond(res, false, 'Category not found', 404);
    return respond(res, true, { id });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};
