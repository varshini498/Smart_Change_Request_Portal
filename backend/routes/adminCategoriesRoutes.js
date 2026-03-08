const express = require('express');
const controller = require('../controllers/adminCategoriesController');

const router = express.Router();

router.get('/', controller.getCategories);
router.post('/', controller.createCategory);
router.put('/:id', controller.updateCategory);
router.delete('/:id', controller.deleteCategory);

module.exports = router;
