const express = require('express');
const router = express.Router();
const {
  createSharedLink,
  getSharedLinks,
  getSharedLink,
  updateSharedLink,
  deleteSharedLink
} = require('../controllers/sharedLinkController');

const { protect } = require('../middleware/auth');

// Proteger todas as rotas
router.use(protect);

// Rotas para gerenciamento de links compartilháveis
router.route('/')
  .post(createSharedLink)
  .get(getSharedLinks);

router.route('/:id')
  .get(getSharedLink)
  .put(updateSharedLink)
  .delete(deleteSharedLink);

module.exports = router;
