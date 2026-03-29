const { query } = require('../config/db');
const respond = require('../utils/respond');

exports.getCategories = async (_req, res) => {
  try {
    const result = await query('SELECT id, name, created_at FROM categories ORDER BY name ASC');
    return respond(res, true, result.rows);
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};

exports.createCategory = async (req, res) => {
  try {
    const { name } = req.body || {};
    const finalName = String(name || '').trim();
    if (!finalName) return respond(res, false, 'name is required', 400);
    const result = await query(
      'INSERT INTO categories (name, created_at) VALUES ($1, $2) RETURNING id',
      [finalName, new Date().toISOString()]
    );
    return respond(res, true, { id: result.rows[0].id, name: finalName }, 201);
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE') || err.code === '23505') {
      return respond(res, false, 'Category already exists', 400);
    }
    return respond(res, false, err.message, 500);
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name } = req.body || {};
    const finalName = String(name || '').trim();
    if (Number.isNaN(id)) return respond(res, false, 'Invalid category id', 400);
    if (!finalName) return respond(res, false, 'name is required', 400);
    const result = await query('UPDATE categories SET name = $1 WHERE id = $2', [finalName, id]);
    if (!result.rowCount) return respond(res, false, 'Category not found', 404);
    return respond(res, true, { id, name: finalName });
  } catch (err) {
    if (String(err.message || '').includes('UNIQUE') || err.code === '23505') {
      return respond(res, false, 'Category already exists', 400);
    }
    return respond(res, false, err.message, 500);
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) return respond(res, false, 'Invalid category id', 400);
    const result = await query('DELETE FROM categories WHERE id = $1', [id]);
    if (!result.rowCount) return respond(res, false, 'Category not found', 404);
    return respond(res, true, { id });
  } catch (err) {
    return respond(res, false, err.message, 500);
  }
};
