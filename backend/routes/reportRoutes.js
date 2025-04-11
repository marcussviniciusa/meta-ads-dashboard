const express = require('express');
const { generateMetricsReport, getReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Rota para obter o relatório via link compartilhável (pública, acessível com o ID do relatório)
router.get('/:reportId', getReport);

// Todas as rotas abaixo deste middleware requerem autenticação
router.use(protect);

// Rota para gerar relatório (todos os usuários autenticados podem gerar)
router.post('/generate/:companyId/:adAccountId', generateMetricsReport);

module.exports = router;
