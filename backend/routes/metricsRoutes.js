const express = require('express');
const {
  getMetrics,
  syncCompanyMetrics
} = require('../controllers/metricsController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Aplicar middleware de proteção a todas as rotas
router.use(protect);

// Rota para obter métricas (acessível a todos os usuários autenticados)
router.get('/:companyId/:adAccountId', getMetrics);

// Rota para sincronizar métricas (somente superadmin)
router.post('/sync/:companyId', authorize('superadmin'), syncCompanyMetrics);

module.exports = router;
