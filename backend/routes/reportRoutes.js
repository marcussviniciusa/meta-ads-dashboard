const express = require('express');
const { generateMetricsReport, getReport, downloadReport } = require('../controllers/simpleReportController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Servindo relatórios PDFs via pasta pública estática

// Rota para download direto do PDF (usando o método mais robusto) - deve vir antes da rota genérica
router.get('/download/:reportId', downloadReport);

// Rota para obter o relatório via link compartilhável (pública, acessível com o ID do relatório)
router.get('/:reportId', getReport);

// Todas as rotas abaixo deste middleware requerem autenticação
router.use(protect);

// Rota para gerar relatório (todos os usuários autenticados podem gerar)
router.post('/generate/:companyId/:adAccountId', generateMetricsReport);

module.exports = router;
