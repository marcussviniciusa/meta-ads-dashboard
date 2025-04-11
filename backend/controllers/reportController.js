const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const asyncHandler = require('../middlewares/asyncHandler');
const MetricsData = require('../models/MetricsData');
const Company = require('../models/Company');
const ErrorResponse = require('../utils/errorResponse');
const moment = require('moment');
const crypto = require('crypto');

// Diretório onde os PDFs serão salvos
const REPORT_DIR = path.join(__dirname, '../reports');

// Garantir que o diretório existe
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

// Modelo para tracking de relatórios gerados
let reports = {};

/**
 * Formatar valores numéricos para exibição no relatório
 */
const formatNumber = (num) => {
  if (num === undefined || num === null || isNaN(num)) {
    return '0';
  }
  return new Intl.NumberFormat('pt-BR', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(num);
};

/**
 * Formatar valores monetários para exibição no relatório
 */
const formatCurrency = (value) => {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00';
  }
  return `R$ ${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}`;
};

/**
 * Formatar valores percentuais para exibição no relatório
 */
const formatPercent = (value) => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0%';
  }
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)}%`;
};

/**
 * @desc    Gerar relatório PDF com métricas
 * @route   POST /api/reports/generate/:companyId/:adAccountId
 * @access  Private
 */
const generateMetricsReport = asyncHandler(async (req, res) => {
  const { companyId, adAccountId } = req.params;
  const { startDate, endDate, reportName } = req.body;
  
  if (!startDate || !endDate) {
    return next(new ErrorResponse('Por favor, forneça as datas de início e fim do relatório', 400));
  }

  // Verificar se a empresa existe e o usuário tem acesso
  const company = await Company.findById(companyId);
  if (!company) {
    return next(new ErrorResponse('Empresa não encontrada', 404));
  }

  // Verificar se o usuário tem acesso a esta empresa
  if (req.user.role !== 'superadmin' && req.user.company.toString() !== companyId) {
    return next(new ErrorResponse('Acesso não autorizado a esta empresa', 403));
  }

  // Verificar se a conta de anúncios pertence à empresa
  const adAccount = company.metaAdAccounts.find(acc => acc.accountId === adAccountId);
  if (!adAccount) {
    return next(new ErrorResponse('Conta de anúncios não encontrada nesta empresa', 404));
  }

  // Buscar dados de métricas no período especificado
  const metrics = await MetricsData.find({
    company: companyId,
    adAccountId,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).sort({ date: 1 });

  if (!metrics || metrics.length === 0) {
    return next(new ErrorResponse('Nenhum dado de métrica encontrado para o período', 404));
  }

  // Gerar um nome para o relatório se não for fornecido
  const formattedReportName = reportName || 
    `Relatório de Métricas - ${company.name} - ${moment(startDate).format('DD/MM/YYYY')} a ${moment(endDate).format('DD/MM/YYYY')}`;

  // Gerar um ID único para o relatório
  const reportId = crypto.randomUUID();
  const fileName = `${reportId}.pdf`;
  const filePath = path.join(REPORT_DIR, fileName);

  // Calcular métricas totais
  const totalMetrics = metrics.reduce((totals, item) => {
    const data = item.metrics;
    return {
      impressions: (totals.impressions || 0) + (data.impressions || 0),
      clicks: (totals.clicks || 0) + (data.clicks || 0),
      spend: (totals.spend || 0) + (data.spend || 0),
      reach: (totals.reach || 0) + (data.reach || 0),
      conversions: (totals.conversions || 0) + (data.conversions || 0),
      purchases: (totals.purchases || 0) + (data.purchases || 0),
    };
  }, {});

  // Calcular métricas derivadas
  totalMetrics.ctr = (totalMetrics.clicks / totalMetrics.impressions) * 100;
  totalMetrics.cpc = totalMetrics.spend / totalMetrics.clicks;
  totalMetrics.cpm = (totalMetrics.spend / totalMetrics.impressions) * 1000;
  totalMetrics.frequency = totalMetrics.impressions / totalMetrics.reach;

  // Criar PDF
  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Adicionar título e cabeçalho
  doc.fontSize(20).text(formattedReportName, { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Período: ${moment(startDate).format('DD/MM/YYYY')} a ${moment(endDate).format('DD/MM/YYYY')}`, { align: 'center' });
  doc.moveDown(2);

  // Adicionar resumo de métricas
  doc.fontSize(16).text('Resumo de Métricas', { underline: true });
  doc.moveDown();

  const metricLabels = [
    { key: 'impressions', label: 'Impressões' },
    { key: 'clicks', label: 'Cliques' },
    { key: 'spend', label: 'Investimento', format: formatCurrency },
    { key: 'reach', label: 'Alcance' },
    { key: 'ctr', label: 'CTR', format: formatPercent },
    { key: 'cpc', label: 'CPC', format: formatCurrency },
    { key: 'cpm', label: 'CPM', format: formatCurrency },
    { key: 'conversions', label: 'Conversões' },
    { key: 'purchases', label: 'Compras' },
  ];

  // Desenhar a tabela de métricas
  doc.font('Helvetica');
  for (const { key, label, format } of metricLabels) {
    const value = totalMetrics[key];
    const formatter = format || formatNumber;
    doc.fontSize(12);
    doc.text(`${label}: ${formatter(value)}`, { continued: false });
    doc.moveDown(0.5);
  }

  // Adicionar dados diários
  doc.addPage();
  doc.fontSize(16).text('Dados Diários', { underline: true });
  doc.moveDown();

  // Cabeçalho da tabela
  const tableTop = doc.y + 15;
  const colSpacing = 15;
  const dateWidth = 80;
  const numWidth = 70;
  const columns = [
    { name: 'Data', width: dateWidth },
    { name: 'Impressões', width: numWidth },
    { name: 'Cliques', width: numWidth },
    { name: 'CTR', width: numWidth },
    { name: 'Custo', width: numWidth },
    { name: 'Compras', width: numWidth },
  ];

  let currentY = tableTop;
  let currentX = 50;

  // Desenhar cabeçalho da tabela
  doc.font('Helvetica-Bold').fontSize(10);
  columns.forEach(column => {
    doc.text(column.name, currentX, currentY, { width: column.width, align: 'left' });
    currentX += column.width + colSpacing;
  });

  // Linha horizontal após cabeçalho
  currentY += 15;
  doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
  currentY += 10;

  // Dados da tabela
  doc.font('Helvetica').fontSize(10);
  metrics.forEach(item => {
    const data = item.metrics;
    currentX = 50;

    // Data
    doc.text(moment(item.date).format('DD/MM/YYYY'), currentX, currentY, { width: dateWidth, align: 'left' });
    currentX += dateWidth + colSpacing;

    // Impressões
    doc.text(formatNumber(data.impressions), currentX, currentY, { width: numWidth, align: 'left' });
    currentX += numWidth + colSpacing;

    // Cliques
    doc.text(formatNumber(data.clicks), currentX, currentY, { width: numWidth, align: 'left' });
    currentX += numWidth + colSpacing;

    // CTR
    doc.text(formatPercent(data.ctr), currentX, currentY, { width: numWidth, align: 'left' });
    currentX += numWidth + colSpacing;

    // Custo
    doc.text(formatCurrency(data.spend), currentX, currentY, { width: numWidth, align: 'left' });
    currentX += numWidth + colSpacing;

    // Compras
    doc.text(formatNumber(data.purchases), currentX, currentY, { width: numWidth, align: 'left' });

    currentY += 20;

    // Se exceder a página, adicionar nova página
    if (currentY > doc.page.height - 50) {
      doc.addPage();
      currentY = 50;

      // Redesenhar cabeçalho da tabela na nova página
      currentX = 50;
      doc.font('Helvetica-Bold').fontSize(10);
      columns.forEach(column => {
        doc.text(column.name, currentX, currentY, { width: column.width, align: 'left' });
        currentX += column.width + colSpacing;
      });

      // Linha horizontal após cabeçalho
      currentY += 15;
      doc.moveTo(50, currentY).lineTo(550, currentY).stroke();
      currentY += 10;
      doc.font('Helvetica').fontSize(10);
    }
  });

  // Adicionar rodapé com informações de geração
  doc.fontSize(8).text(
    `Relatório gerado em ${moment().format('DD/MM/YYYY [às] HH:mm:ss')} | Meta Ads Dashboard`,
    50,
    doc.page.height - 50,
    { align: 'center' }
  );

  doc.end();

  // Aguardar que o stream termine de escrever o arquivo
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  // Registrar o relatório gerado para acesso posterior
  const expirationMs = 7 * 24 * 60 * 60 * 1000; // 7 dias em milissegundos
  const expiresAt = new Date(Date.now() + expirationMs);
  
  reports[reportId] = {
    fileName,
    filePath,
    reportName: formattedReportName,
    companyId,
    adAccountId,
    startDate,
    endDate,
    generatedBy: req.user._id,
    generatedAt: new Date(),
    expiresAt
  };

  // Automaticamente limpar relatórios antigos após a expiração
  setTimeout(() => {
    if (reports[reportId]) {
      try {
        fs.unlinkSync(reports[reportId].filePath);
      } catch (error) {
        console.error(`Erro ao remover arquivo ${reports[reportId].filePath}:`, error);
      }
      delete reports[reportId];
    }
  }, expirationMs);

  // Retornar URL de acesso ao relatório
  const reportUrl = `/api/reports/${reportId}`;
  res.status(200).json({
    success: true,
    data: {
      reportId,
      reportName: formattedReportName,
      reportUrl,
      expiresAt
    }
  });
});

/**
 * @desc    Obter relatório PDF gerado anteriormente
 * @route   GET /api/reports/:reportId
 * @access  Public (com ID do relatório)
 */
const getReport = asyncHandler(async (req, res, next) => {
  const { reportId } = req.params;

  // Verificar se o relatório existe
  if (!reports[reportId]) {
    return next(new ErrorResponse('Relatório não encontrado ou expirado', 404));
  }

  const report = reports[reportId];

  // Verificar se o relatório expirou
  if (new Date() > report.expiresAt) {
    try {
      fs.unlinkSync(report.filePath);
    } catch (error) {
      console.error(`Erro ao remover arquivo expirado ${report.filePath}:`, error);
    }
    delete reports[reportId];
    return next(new ErrorResponse('O link para este relatório expirou', 410));
  }

  // Enviar o arquivo PDF
  res.setHeader('Content-Disposition', `attachment; filename="${report.reportName}.pdf"`);
  res.setHeader('Content-Type', 'application/pdf');
  
  const fileStream = fs.createReadStream(report.filePath);
  fileStream.pipe(res);
});

module.exports = {
  generateMetricsReport,
  getReport
};
