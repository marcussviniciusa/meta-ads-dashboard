const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const asyncHandler = require('../middlewares/asyncHandler');
const MetricsData = require('../models/MetricsData');
const Company = require('../models/Company');
const ErrorResponse = require('../utils/errorResponse');
const moment = require('moment');
const chartGenerator = require('../utils/chartGenerator');

// Armazenar os relatórios gerados em memória para acesso temporário
const reports = {};

/**
 * Formatar valores numéricos para exibição no relatório
 */
const formatNumber = (value) => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0';
  }
  return new Intl.NumberFormat('pt-BR').format(value);
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

// Mapeamento de chaves de métricas para rótulos formatados
const metricLabelsMap = {
  impressions: { label: 'Impressões', format: formatNumber },
  clicks: { label: 'Cliques', format: formatNumber },
  spend: { label: 'Investimento', format: formatCurrency },
  reach: { label: 'Alcance', format: formatNumber },
  ctr: { label: 'CTR', format: formatPercent },
  cpc: { label: 'CPC', format: formatCurrency },
  cpm: { label: 'CPM', format: formatCurrency },
  frequency: { label: 'Frequência', format: formatNumber },
  unique_clicks: { label: 'Cliques Únicos', format: formatNumber },
  unique_ctr: { label: 'CTR Único', format: formatPercent },
  cost_per_unique_click: { label: 'Custo p/ Clique Único', format: formatCurrency },
  conversions: { label: 'Conversões', format: formatNumber },
  cost_per_conversion: { label: 'Custo p/ Conversão', format: formatCurrency },
  conversion_rate: { label: 'Taxa de Conversão', format: formatPercent },
  purchases: { label: 'Compras', format: formatNumber }
};

/**
 * @desc    Gerar relatório PDF com métricas
 * @route   POST /api/reports/generate/:companyId/:adAccountId
 * @access  Private
 */
const generateMetricsReport = asyncHandler(async (req, res, next) => {
  const { companyId, adAccountId } = req.params;
  const { 
    startDate, 
    endDate, 
    selectedMetrics = ['impressions', 'clicks', 'spend', 'ctr', 'cpc'], 
    selectedCharts = ['performance_over_time', 'performance_comparison'],
    reportName = 'Relatório de Métricas',
    includeGraphics = true,
    theme = 'modern'
  } = req.body;
  
  // Usar o reportName como título ou fallback para um valor padrão
  const title = reportName || 'Relatório de Métricas';
  
  console.log(`Métricas selecionadas para o relatório: ${selectedMetrics.join(', ')}`);
  console.log(`Gráficos selecionados para o relatório: ${selectedCharts.join(', ')}`);
  
  
  console.log(`Gerando relatório para ${companyId}/${adAccountId} de ${startDate} até ${endDate}`);
  
  // Buscar dados da empresa
  const company = await Company.findById(companyId);
  if (!company) {
    return next(new ErrorResponse(`Empresa não encontrada com id ${companyId}`, 404));
  }
  
  // Encontrar a conta de anúncio
  const adAccount = company.metaAdAccounts.find(acc => acc.accountId === adAccountId);
  if (!adAccount) {
    return next(new ErrorResponse(`Conta de anúncio não encontrada: ${adAccountId}`, 404));
  }
  
  // Buscar métricas para o período selecionado
  const metrics = await MetricsData.find({
    company: companyId, // Campo corrigido de companyId para company
    adAccountId,
    date: { $gte: new Date(startDate), $lte: new Date(endDate) }
  }).sort({ date: 1 });
  
  if (!metrics || metrics.length === 0) {
    return next(new ErrorResponse('Nenhum dado encontrado para o período selecionado', 404));
  }
  
  // Gerar ID único para o relatório
  const reportId = `${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  
  // Dados para o nome do relatório
  const formattedStartDate = moment(startDate).format('DD/MM/YYYY');
  const formattedEndDate = moment(endDate).format('DD/MM/YYYY');
  const formattedReportName = `${title} - ${formattedStartDate} a ${formattedEndDate}`;
  
  // Caminho para salvar o arquivo PDF gerado
  const fileName = `${reportId}.pdf`;
  const tempDir = path.join(__dirname, '../temp/reports');
  
  // Garantir que o diretório existe
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const filePath = path.join(tempDir, fileName);
  
  // Calcular métricas totais para o período
  const totalMetrics = metrics.reduce((totals, day) => {
    selectedMetrics.forEach(metric => {
      if (!isNaN(day.metrics[metric])) {
        totals[metric] = (totals[metric] || 0) + day.metrics[metric];
      }
    });
    return totals;
  }, {});
  
  // Calcular médias para métricas que não são somáveis
  if (totalMetrics.impressions && totalMetrics.clicks) {
    totalMetrics.ctr = (totalMetrics.clicks / totalMetrics.impressions) * 100;
  }
  
  if (totalMetrics.clicks && totalMetrics.spend) {
    totalMetrics.cpc = totalMetrics.spend / totalMetrics.clicks;
  }
  
  if (totalMetrics.impressions && totalMetrics.spend) {
    totalMetrics.cpm = (totalMetrics.spend / totalMetrics.impressions) * 1000;
  }
  
  if (totalMetrics.impressions && totalMetrics.reach) {
    totalMetrics.frequency = totalMetrics.impressions / totalMetrics.reach;
  }
  
  // Função para recuperar o valor agregado de uma métrica específica
  const getAggregatedValue = (metricKey) => {
    return totalMetrics[metricKey] || 0;
  };
  
  // Gerar gráficos para o relatório conforme selecionado pelo usuário
  console.log('Gerando gráficos para o relatório...');
  
  // Obter caminhos para os gráficos
  const chartPaths = [];
  
  // Apenas gerar gráficos se o parâmetro includeGraphics for true
  if (includeGraphics) {
    try {
      // Gráfico de evolução temporal das métricas
      if (selectedCharts.includes('performance_over_time')) {
        console.log('Gerando gráfico de evolução temporal');
        const timeSeriesChartPath = await chartGenerator.generateTimeSeriesChart(
          metrics, 
          selectedMetrics.slice(0, 3), // Limitando a 3 métricas para melhor visualização
          'Desempenho ao Longo do Período'
        );
        chartPaths.push(timeSeriesChartPath);
      }
      
      // Gráfico de comparação de métricas
      if (selectedCharts.includes('performance_comparison')) {
        console.log('Gerando gráfico de comparação de métricas');
        // Usar diretamente as métricas selecionadas pelo usuário
        if (selectedMetrics.length >= 2) {
          const metricsToCompare = selectedMetrics.slice(0, 4); // Limitar a 4 métricas para visualização
          const performanceComparisonChart = await chartGenerator.generateComparisonChart(
            metrics, 
            metricsToCompare, 
            'Comparação de Métricas'
          );
          chartPaths.push(performanceComparisonChart);
        }
      }
      
      // Gráfico de distribuição (pizza) - se disponível e selecionado
      if (selectedCharts.includes('distribution_pie_chart') && metrics.length > 0) {
        console.log('Gerando gráfico de distribuição');
        try {
          const pieChartPath = await chartGenerator.generatePieChart(
            metrics, 
            'Distribuição de Resultados'
          );
          chartPaths.push(pieChartPath);
        } catch (error) {
          console.error('Erro ao gerar gráfico de pizza:', error);
          // Continuar mesmo com erro neste gráfico
        }
      }
      
      console.log(`Gerados ${chartPaths.length} gráficos para o relatório`);
    } catch (error) {
      console.error('Erro ao gerar gráficos:', error);
      // Continuar mesmo com erro nos gráficos
    }
  }
  
  // Criar o documento PDF com design profissional
  const doc = new PDFDocument({ 
    size: 'A4', 
    margin: 50,
    info: {
      Title: formattedReportName,
      Author: 'Meta Ads Dashboard',
      Subject: 'Relatório de Métricas de Anúncios',
      Keywords: 'facebook, instagram, ads, metrics, report'
    }
  });
  
  // Constantes para layout
  const width = doc.page.width - 100;
  const height = doc.page.height;
  
  // Criar o stream para o arquivo
  const stream = fs.createWriteStream(filePath);
  
  // Evento quando o PDF terminar de ser escrito
  stream.on('finish', function() {
    // Garantir que a pasta pública para PDFs existe
    const publicDir = path.join(__dirname, '../public/reports');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Copiar o arquivo para a pasta pública
    const publicFilePath = path.join(publicDir, `${reportId}.pdf`);
    fs.copyFileSync(filePath, publicFilePath);
    
    // URL para acesso direto ao arquivo estático
    const reportUrl = `/reports/${reportId}.pdf`;
    console.log(`URL para acesso ao relatório: ${reportUrl}`);
  
    // Registrar o relatório para acesso posterior
    const expirationMs = 7 * 24 * 60 * 60 * 1000; // 7 dias
    const expiresAt = new Date(Date.now() + expirationMs);
    
    reports[reportId] = {
      fileName,
      filePath,
      reportName: formattedReportName,
      companyId,
      adAccountId,
      startDate,
      endDate,
      generatedBy: req.user ? req.user._id : 'system',
      generatedAt: new Date(),
      expiresAt,
      publicPath: publicFilePath,
      url: reportUrl
    };
    
    // Limpar automaticamente após expiração
    setTimeout(() => {
      if (reports[reportId]) {
        try {
          if (fs.existsSync(reports[reportId].filePath)) {
            fs.unlinkSync(reports[reportId].filePath);
          }
          if (fs.existsSync(reports[reportId].publicPath)) {
            fs.unlinkSync(reports[reportId].publicPath);
          }
          // Limpar arquivos de gráficos temporários, se existirem
          chartPaths.forEach(chartPath => {
            if (fs.existsSync(chartPath)) {
              fs.unlinkSync(chartPath);
            }
          });
        } catch (error) {
          console.error(`Erro ao remover arquivos do relatório ${reportId}:`, error);
        }
        delete reports[reportId];
      }
    }, expirationMs);
  });
  
  // Conectar o documento ao stream
  doc.pipe(stream);
  
  // === HEADER ===
  // Adicionar barra colorida no topo (estilo moderno)
  doc.rect(0, 0, doc.page.width, 15)
     .fill('#4361ee');
  
  // Adicionar título com destaque
  doc.fontSize(22)
     .font('Helvetica-Bold')
     .fillColor('#333333')
     .text(formattedReportName, 50, 40, { align: 'center' });
  
  doc.moveDown(0.5)
     .fontSize(14)
     .font('Helvetica')
     .fillColor('#555555')
     .text(`Período: ${formattedStartDate} a ${formattedEndDate}`, { align: 'center' });
  
  // Adicionar linha divisória
  doc.moveDown(1);
  doc.lineWidth(1)
     .lineCap('butt')
     .strokeColor('#e1e1e1')
     .moveTo(50, doc.y)
     .lineTo(doc.page.width - 50, doc.y)
     .stroke();
  
  // === SEÇÃO DE MÉTRICAS PRINCIPAIS ===
  doc.moveDown(1)
     .fillColor('#333333')
     .fontSize(16)
     .font('Helvetica-Bold')
     .text('Métricas Principais', 50, doc.y, { underline: true });
  
  // Criar caixas de destaque para métricas principais
  doc.moveDown(1);
  let boxY = doc.y;
  const boxHeight = 80;
  const boxWidth = width / 3 - 15;
  
  // Usar as primeiras três métricas selecionadas pelo usuário como principais
  const keyMetrics = selectedMetrics.slice(0, 3); // Pegar as 3 primeiras métricas selecionadas pelo usuário
  
  // Preparar dados para métricas-chave que serão destacadas no topo
  const keyMetricsData = [];
  
  // Adicionar as métricas-chave selecionadas pelo usuário
  keyMetrics.forEach(metricKey => {
    const metric = metricLabelsMap[metricKey];
    if (metric) {
      keyMetricsData.push({
        label: metric.label,
        value: metric.format(getAggregatedValue(metricKey)),
        description: ''
      });
    }
  });

  keyMetricsData.forEach((metric, index) => {
    if (metric) {
      const boxX = 50 + (index * (boxWidth + 15));
      
      // Caixa com cor de fundo
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 5)
         .fillAndStroke('#f8f9fa', '#e9ecef');
      
      // Nome da métrica
      doc.fillColor('#333333')
         .fontSize(14)
         .font('Helvetica-Bold')
         .text(metric.label, boxX + 10, boxY + 15, { width: boxWidth - 20, align: 'center' });
      
      // Valor da métrica
      doc.fillColor('#4361ee')
         .fontSize(22)
         .font('Helvetica-Bold')
         .text(metric.value, boxX + 10, boxY + 35, { width: boxWidth - 20, align: 'center' });
    }
  });

  // === TABELA DE MÉTRICAS COMPLETA ===
  doc.moveDown(5);
  doc.fillColor('#333333')
     .fontSize(16)
     .font('Helvetica-Bold')
     .text('Detalhamento de Métricas', 50, doc.y, { underline: true });
  
  // Layout em duas colunas
  // Adicionar o restante das métricas em formato de tabela
  const metricsList = selectedMetrics.filter(m => !keyMetrics.includes(m));
  
  // Adicionar tabela com todas as métricas selecionadas pelo usuário
  if (metricsList.length > 0 || selectedMetrics.length > 0) {
    doc.addPage();
    doc.font('Helvetica-Bold').fontSize(18).text('Detalhamento de Métricas', { align: 'center' });
    doc.moveDown(0.5);
    
    // Adicionar tabela
    const table = {
      headers: ['Métrica', 'Valor'],
      rows: []
    };
    
    // Incluir TODAS as métricas selecionadas pelo usuário na tabela
    selectedMetrics.forEach(metricKey => {
      if (metricLabelsMap[metricKey]) {
        const currentValue = getAggregatedValue(metricKey);
        
        table.rows.push([
          metricLabelsMap[metricKey].label,
          metricLabelsMap[metricKey].format(currentValue)
        ]);
      }
    });

    // Desenhar tabela
    doc.font('Helvetica').fontSize(10);
    const startY = doc.y;
    
    // Cabeçalho da tabela
    doc.font('Helvetica-Bold');
    // Ajustando larguras das colunas para tabela com 2 colunas
    const colWidths = [250, 250];
    let y = startY;
    
    // Desenhar cabeçalho
    doc.rect(70, y, 500, 30).fillAndStroke('#f5f5f5', '#cccccc');
    doc.fillColor('#000000');
    
    table.headers.forEach((header, i) => {
      doc.text(header, 80 + (i * colWidths[i]), y + 10, { width: colWidths[i], align: 'left' });
    });
    
    y += 30;
    
    // Desenhar linhas
    doc.font('Helvetica');
    let alternate = false;
    
    table.rows.forEach((row, rowIndex) => {
      alternate = !alternate;
      doc.rect(70, y, 500, 25).fillAndStroke(alternate ? '#ffffff' : '#f9f9f9', '#eeeeee');
      doc.fillColor('#000000');
      
      row.forEach((cell, i) => {
        doc.text(cell, 80 + (i * colWidths[i]), y + 7, { width: colWidths[i], align: i === 0 ? 'left' : 'center' });
      });
      
      y += 25;
    });
  }

  // === SEÇÃO DE GRÁFICOS ===
  // Adicionar gráficos se disponíveis
  if (chartPaths.length > 0) {
    // Garantir que estamos em uma nova página para os gráficos
    if (doc.y > 500) {
      doc.addPage();
      doc.y = 50;
    } else {
      doc.moveDown(2);
    }
    
    doc.fillColor('#333333')
       .fontSize(16)
       .font('Helvetica-Bold')
       .text('Análise Visual de Desempenho', 50, doc.y, { underline: true });
       
    doc.moveDown(1);
    
    // Adicionar os gráficos
    const chartHeight = 250;
    let chartY = doc.y;
    
    for (let i = 0; i < chartPaths.length; i++) {
      // Verificar espaço disponível na página
      if (chartY + chartHeight > height - 50) {
        doc.addPage();
        chartY = 50;
      }
      
      // Adicionar título do gráfico
      const chartTitle = i === 0 ? 'Evolução das Métricas no Período' : 'Comparação de Métricas';
      doc.fontSize(14)
         .font('Helvetica-Bold')
         .text(chartTitle, 50, chartY);
      
      chartY += 20;
      
      // Adicionar imagem do gráfico
      try {
        doc.image(chartPaths[i], 50, chartY, { width: width, height: chartHeight });
        chartY += chartHeight + 30;
      } catch (error) {
        console.error(`Erro ao adicionar gráfico ${i+1}:`, error);
        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#ff0000')
           .text('Erro ao carregar gráfico', 50, chartY + 20);
        chartY += 50;
      }
    }
  }
  
  // === FOOTER ===
  doc.fontSize(8)
     .font('Helvetica')
     .fillColor('#888888')
     .text(`Relatório gerado por Meta Ads Dashboard em ${moment().format('DD/MM/YYYY [às] HH:mm')}`, 50, doc.page.height - 50, { align: 'center' });
  
  // Adicionar uma marca d'água sutil
  doc.fontSize(72)
     .fillColor('#f1f1f1')
     .fillOpacity(0.3)
     .text('META ADS', 100, doc.page.height / 2 - 36, { align: 'center' });
  
  // Finalizar o documento
  doc.end();
  
  // Retornar ID do relatório e URL para download
  res.status(200).json({
    success: true,
    data: {
      reportId,
      reportName: formattedReportName,
      reportUrl: `/reports/${reportId}.pdf`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias
    }
  });
});

/**
 * @desc    Baixar relatório PDF diretamente
 * @route   GET /api/reports/download/:reportId
 * @access  Public (com ID do relatório)
 */
const downloadReport = asyncHandler(async (req, res, next) => {
  const { reportId } = req.params;
  
  // Verificar se o relatório existe
  if (!reports[reportId]) {
    console.log(`Relatório não encontrado: ${reportId}`);
    return next(new ErrorResponse('Relatório não encontrado ou expirado', 404));
  }
  
  const report = reports[reportId];
  
  // Verificar se o arquivo físico existe
  if (!fs.existsSync(report.publicPath)) {
    console.log(`Arquivo do relatório não encontrado: ${report.publicPath}`);
    return next(new ErrorResponse('Arquivo do relatório não encontrado', 404));
  }
  
  // Servir o arquivo
  res.sendFile(report.publicPath);
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
    console.log(`Relatório não encontrado: ${reportId}`);
    return next(new ErrorResponse('Relatório não encontrado ou expirado', 404));
  }
  
  const report = reports[reportId];
  
  res.status(200).json({
    success: true,
    data: {
      reportId,
      reportName: report.reportName,
      reportUrl: report.url,
      generatedAt: report.generatedAt,
      expiresAt: report.expiresAt
    }
  });
});

module.exports = {
  generateMetricsReport,
  getReport,
  downloadReport
};
