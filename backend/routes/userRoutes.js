const express = require('express');
const { 
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  updateUserStatus
} = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Aplicar middleware de proteção a todas as rotas
router.use(protect);

// Rotas que exigem permissão de superadmin
router
  .route('/')
  .get(authorize('superadmin'), getUsers)
  .post(authorize('superadmin'), createUser);

router
  .route('/:id')
  .get(authorize('superadmin'), getUser)
  .put(authorize('superadmin'), updateUser)
  .delete(authorize('superadmin'), deleteUser);

router
  .route('/:id/password')
  .put(authorize('superadmin'), changePassword);

router
  .route('/:id/status')
  .put(authorize('superadmin'), updateUserStatus);

module.exports = router;
