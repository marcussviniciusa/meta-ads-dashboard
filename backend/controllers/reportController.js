const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const asyncHandler = require('../middlewares/asyncHandler');
const MetricsData = require('../models/MetricsData');
const Company = require('../models/Company');
const ErrorResponse = require('../utils/errorResponse');
const moment = require('moment');
const crypto = require('crypto');
const chartGenerator = require('../utils/chartGenerator');

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
  cost_per_unique_click: { label: 'Custo por Clique Único', format: formatCurrency },
  conversions: { label: 'Conversões', format: formatNumber },
  cost_per_conversion: { label: 'Custo por Conversão', format: formatCurrency },
  conversion_rate: { label: 'Taxa de Conversão', format: formatPercent },
  purchases: { label: 'Compras', format: formatNumber }
};

// Métricas padrão se o usuário não especificar
const defaultMetrics = [
  'impressions',
  'clicks',
  'spend',
  'reach',
  'ctr',
  'cpc',
  'conversions',
  'purchases'
];

// Mapeamento de tipos de gráficos
const chartTypeMap = {
  'performance_over_time': {
    generate: chartGenerator.generateTimeSeriesChart,
    title: 'Desempenho ao Longo do Tempo',
    defaultMetrics: ['impressions', 'clicks', 'spend', 'conversions']
  },
  'performance_comparison': {
    generate: chartGenerator.generateComparisonChart,
    title: 'Comparação de Métricas',
    defaultMetrics: ['impressions', 'clicks', 'spend', 'conversions', 'purchases']
  },
  'cost_distribution': {
    generate: chartGenerator.generatePieChart,
    title: 'Distribuição de Custos por Campanha',
    defaultMetrics: ['spend']
  }
};

// Gráficos padrão se o usuário não especificar
const defaultCharts = ['performance_over_time', 'performance_comparison'];

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
    reportName, 
    selectedMetrics = defaultMetrics,
    selectedCharts = defaultCharts,
    includeGraphics = true,
    theme = 'modern'
  } = req.body;
  
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
    // Inicializar ou atualizar cada métrica selecionada
    selectedMetrics.forEach(metricKey => {
      if (data[metricKey] !== undefined) {
        totals[metricKey] = (totals[metricKey] || 0) + (data[metricKey] || 0);
      }
    });
    return totals;
  }, {});

  // Calcular métricas derivadas se estiverem selecionadas
  if (selectedMetrics.includes('ctr') && totalMetrics.impressions > 0 && totalMetrics.clicks >= 0) {
    totalMetrics.ctr = (totalMetrics.clicks / totalMetrics.impressions) * 100;
  }
  if (selectedMetrics.includes('cpc') && totalMetrics.clicks > 0) {
    totalMetrics.cpc = totalMetrics.spend / totalMetrics.clicks;
  }
  if (selectedMetrics.includes('cpm') && totalMetrics.impressions > 0) {
    totalMetrics.cpm = (totalMetrics.spend / totalMetrics.impressions) * 1000;
  }
  if (selectedMetrics.includes('frequency') && totalMetrics.reach > 0) {
    totalMetrics.frequency = totalMetrics.impressions / totalMetrics.reach;
  }
  if (selectedMetrics.includes('conversion_rate') && totalMetrics.clicks > 0) {
    totalMetrics.conversion_rate = (totalMetrics.conversions / totalMetrics.clicks) * 100;
  }
  if (selectedMetrics.includes('cost_per_conversion') && totalMetrics.conversions > 0) {
    totalMetrics.cost_per_conversion = totalMetrics.spend / totalMetrics.conversions;
  }

  // Gerar gráficos se solicitados
  const chartPaths = [];
  if (includeGraphics) {
    try {
      // Garantir que o diretório para gráficos temporários existe
      const tempChartDir = path.join(__dirname, '../temp/charts');
      if (!fs.existsSync(tempChartDir)) {
        fs.mkdirSync(tempChartDir, { recursive: true });
      }
  
      // Processar cada tipo de gráfico selecionado
      for (const chartType of selectedCharts) {
        if (chartTypeMap[chartType]) {
          const chartConfig = chartTypeMap[chartType];
          
          try {
            let chartPath;
            
            if (chartType === 'cost_distribution') {
              // Gráfico de distribuição de custos (gráfico de pizza)
              chartPath = await chartGenerator.generatePieChart(metrics, chartConfig.title);
            } else if (chartType === 'performance_over_time') {
              // Gráfico de série temporal (gráfico de linha)
              const filteredMetrics = selectedMetrics.filter(m => 
                chartConfig.defaultMetrics.includes(m) || 
                metrics.some(metric => metric.metrics[m] !== undefined)
              );
              
              if (filteredMetrics.length > 0) {
                chartPath = await chartGenerator.generateTimeSeriesChart(
                  metrics, 
                  filteredMetrics, 
                  chartConfig.title
                );
              }
            } else if (chartType === 'performance_comparison') {
              // Gráfico de comparação (gráfico de barras)
              const filteredMetrics = selectedMetrics.filter(m => 
                chartConfig.defaultMetrics.includes(m) || 
                metrics.some(metric => metric.metrics[m] !== undefined)
              );
              
              if (filteredMetrics.length > 0) {
                chartPath = await chartGenerator.generateComparisonChart(
                  metrics, 
                  filteredMetrics, 
                  chartConfig.title
                );
              }
            }
            
            if (chartPath) {
              chartPaths.push(chartPath);
            }
          } catch (chartError) {
            console.error(`Erro ao gerar gráfico ${chartType}:`, chartError);
            // Continuar para o próximo gráfico
          }
        }
      }
    } catch (error) {
      console.error('Erro ao gerar gráficos:', error);
      // Continuar mesmo sem os gráficos
    }
  }

  // Criar PDF
  const doc = new PDFDocument({ 
    margin: 50,
    size: 'A4',
    info: {
      Title: formattedReportName,
      Author: 'Meta Ads Dashboard',
      Creator: 'Meta Ads Dashboard PDF Generator',
      Producer: 'PDFKit'
    }
  });
  
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Aplicar tema baseado na preferência
  const themeStyles = getThemeStyles(theme);

  // Adicionar título e cabeçalho com design mais profissional
  const pageWidth = doc.page.width - 100;
  
  // Faixa de cor como background para o título
  doc.rect(0, 0, doc.page.width, 55)
     .fillColor('#2563EB')  // Azul empresarial
     .fill();
  
  // Título destacado
  doc.fontSize(16)
     .font(`${themeStyles.title.font}-Bold`)  // Garantir negrito
     .fillColor('#FFFFFF')  // Branco para contraste
     .text(formattedReportName, 50, 20, {
        align: 'center',
        width: pageWidth
     });
  
  // Linha decorativa
  doc.moveTo(50, 60).lineTo(550, 60).lineWidth(0.5).strokeColor('#DDDDDD').stroke();
  
  // Informações em layout mais claro com ícones
  const infoY = 65;
  
  // Estilo visual para as informações de cabeçalho
  doc.fontSize(8)
     .font(`${themeStyles.text.font}-Bold`)
     .fillColor('#333333')
     .text('Período:', 50, infoY, { continued: true })
     .font(themeStyles.text.font)
     .fillColor('#555555')
     .text(` ${moment(startDate).format('DD/MM/YYYY')} a ${moment(endDate).format('DD/MM/YYYY')}`, { width: pageWidth/2 - 10 })
     
     .font(`${themeStyles.text.font}-Bold`)
     .fillColor('#333333')
     .text('Empresa:', 50, doc.y + 2, { continued: true })
     .font(themeStyles.text.font)
     .fillColor('#555555')
     .text(` ${company.name}`, { width: pageWidth/2 - 10 })
     
     .font(`${themeStyles.text.font}-Bold`)
     .fillColor('#333333')
     .text('Conta:', 50 + pageWidth/2, infoY, { continued: true })
     .font(themeStyles.text.font)
     .fillColor('#555555')
  
  // Valor da métrica (logo abaixo)
  doc.fontSize(11)
     .font(`${themeStyles.text.font}-Bold`)
     .fillColor(metricColor) // Usar a mesma cor do ícone
     .text(metric.format(totalMetrics[metric.key]), x + 8, y + 12, { width: colWidth - 15 });
});

// Ajustar a posição do cursor para depois da grade
doc.y = startY + gridHeight + 5;

// Adicionar gráficos se foram gerados
if (chartPaths.length > 0) {
  // Se tivermos muitos gráficos ou estivermos muito abaixo na página, adicionar nova página
  if (doc.y > 350 || chartPaths.length > 2) {
    doc.addPage();
    doc.y = 30;
  }
  
  // Criar título personalizado para a seção de gráficos com barra colorida
  doc.rect(50, doc.y, 500, 15)
     .fillColor('#10B981') // Verde para visualizações
     .fill();
  
  doc.fontSize(10)
     .fillColor('#FFFFFF')
     .font('Helvetica-Bold')
     .text('VISUALIZAÇÕES', 60, doc.y - 12);
  
  // Adicionar gráficos com layout mais profissional
  const { width, height } = doc.page;
  const chartStartY = doc.y + 20;
  let chartY = chartStartY;
  
  // Para cada linha de gráficos (2 por linha)
  for (let i = 0; i < chartPaths.length; i += 2) {
    // Determinar a altura desta linha
    const rowHeight = 200; // Altura fixa para cada linha de gráficos
    
    // Se não couber na página atual, adicionar nova página
    if (chartY + rowHeight > height - 70) {
      doc.addPage();
      chartY = 30;
    }
    // Para cada linha de gráficos (2 por linha)
    for (let i = 0; i < chartPaths.length; i += 2) {
      // Determinar a altura desta linha
      const rowHeight = 200; // Altura fixa para cada linha de gráficos
      
      // Se não couber na página atual, adicionar nova página
      if (chartY + rowHeight > height - 70) {
        doc.addPage();
        chartY = 30;
      }
      
      // Criar uma área com fundo claro para os gráficos desta linha
      doc.rect(50, chartY, 500, rowHeight - 10)
         .fillColor('#F9FAFB')
         .fill();
      
      // Adicionar o primeiro gráfico desta linha
      try {
        const firstChart = chartPaths[i];
        const chartWidth = 240;
        
        // Adicionar título pequeno para o gráfico
        doc.fontSize(8)
           .font(`${themeStyles.text.font}-Bold`)
           .fillColor('#374151')
           .text(`Gráfico ${i+1}`, 60, chartY + 10);
        
        // Adicionar o gráfico com borda sutil
        doc.rect(60, chartY + 20, chartWidth, rowHeight - 40)
           .lineWidth(0.5)
           .strokeColor('#E5E7EB')
           .stroke();
           
        doc.image(firstChart, 60, chartY + 20, {
          fit: [chartWidth, rowHeight - 40]
        });
      } catch (error) {
        console.error(`Erro ao adicionar primeiro gráfico da linha:`, error);
      }
      
      // Se houver um segundo gráfico nesta linha
      if (i + 1 < chartPaths.length) {
        try {
          const secondChart = chartPaths[i + 1];
          const chartWidth = 240;
          
          // Adicionar título pequeno para o gráfico
          doc.fontSize(8)
             .font(`${themeStyles.text.font}-Bold`)
             .fillColor('#374151')
             .text(`Gráfico ${i+2}`, 310, chartY + 10);
          
          // Adicionar o gráfico com borda sutil
          doc.rect(310, chartY + 20, chartWidth, rowHeight - 40)
             .lineWidth(0.5)
             .strokeColor('#E5E7EB')
             .stroke();
             
          doc.image(secondChart, 310, chartY + 20, {
            fit: [chartWidth, rowHeight - 40]
          });
        } catch (error) {
          console.error(`Erro ao adicionar segundo gráfico da linha:`, error);
        }
      }
      
      // Avançar para a próxima linha de gráficos
      chartY += rowHeight;
    }
    
    // Atualizar a posição Y para depois dos gráficos
    doc.y = chartY + 5;
  }

  // Adicionar dados diários - possivelmente na mesma página
  if (doc.y > 500) {
    doc.addPage();
    doc.y = 30;
  }
  
  // Título com estilo consistente - barra colorida
  doc.rect(50, doc.y, 500, 15)
     .fillColor('#F59E0B') // Laranja/âmbar para dados diários
     .fill();
     
  doc.fontSize(10)
     .font(themeStyles.text.font.includes('-Bold') ? themeStyles.text.font : `${themeStyles.text.font}-Bold`)
     .fillColor('#FFFFFF')
     .text('DADOS DIÁRIOS', 60, doc.y + 3);
  
  doc.y += 20;

  // Selecionar colunas da tabela com base nas métricas selecionadas
  const tableMetrics = selectedMetrics.slice(0, 5); // Limitar a 5 métricas para caber na página
  
  // Cabeçalho da tabela
  const tableTop = doc.y + 15;
  const colSpacing = 15;
  const dateWidth = 80;
  const numWidth = (500 - dateWidth - colSpacing * tableMetrics.length) / tableMetrics.length;
  
  const columns = [
    { name: 'Data', width: dateWidth }
  ];
  
  tableMetrics.forEach(metric => {
    if (metricLabelsMap[metric]) {
      columns.push({
        name: metricLabelsMap[metric].label,
        width: numWidth,
        metric,
        format: metricLabelsMap[metric].format
      });
    }
  });

  let tableX = 50;
  let tableY = tableTop;

  // Criar fundo da tabela
  // Determinar a altura da tabela
  const tableRowHeight = 18;
  const numRows = metrics.length;
  const tableHeight = (numRows + 1) * tableRowHeight + 10; // +1 para o cabeçalho, +10 para margem
  
  // Fundo para a tabela completa
  doc.rect(50, tableY, 500, tableHeight)
     .fillColor('#F9FAFB') // Mesmo tom de cinza claro usado na seção de métricas
     .fill();
  
  // Cabeçalho da tabela com fundo colorido
  doc.rect(50, tableY, 500, tableRowHeight + 6)
     .fillColor('#4F46E5') // Azul escuro para cabeçalho (mesma cor da seção de métricas)
     .fill();
  
  // Texto do cabeçalho
  doc.font(themeStyles.text.font.includes('-Bold') ? themeStyles.text.font : `${themeStyles.text.font}-Bold`)
     .fontSize(9)
     .fillColor('#FFFFFF'); // Texto branco para contraste
  
  // Posicionar textos do cabeçalho
  columns.forEach(column => {
    doc.text(column.name, tableX, tableY + 3, { 
      width: column.width, 
      align: column.name === 'Data' ? 'left' : 'right' 
    });
    tableX += column.width + colSpacing;
  });

  // Avançar para a primeira linha de dados
  tableY += tableRowHeight + 6;
  
  // Linhas de dados da tabela
  doc.font(themeStyles.text.font)
     .fontSize(8); // Fonte menor para dados da tabela
  
  metrics.forEach((item, index) => {
    const data = item.metrics;
    tableX = 50;

    // Estilo alternado mais sutil
    const isEvenRow = index % 2 === 0;
    if (isEvenRow) {
      doc.rect(50, tableY, 500, tableRowHeight)
         .fillColor('#FFFFFF') // Branco para linhas pares
         .fill();
    }
    
    // Data formatada com estilo mais elegante
    const formattedDate = moment(item.date).format('DD/MM/YYYY');
    doc.fillColor('#374151') // Cinza escuro para melhor legibilidade
       .font(themeStyles.text.font.includes('-Bold') ? themeStyles.text.font : `${themeStyles.text.font}-Bold`) // Negrito para a data
       .text(formattedDate, tableX + 5, tableY + 4, { 
          width: columns[0].width - 5, 
          align: 'left' 
       });
    tableX += columns[0].width + colSpacing;
    
    // Valores das métricas com cores baseadas no tipo
    for (let i = 1; i < columns.length; i++) {
      const column = columns[i];
      const value = data[column.metric] || 0;
      
      // Escolher cor baseada no tipo de métrica
      let textColor;
      if (column.metric.includes('spend') || column.metric.includes('cost')) {
        textColor = '#EF4444'; // Vermelho para valores monetários
      } else if (column.metric.includes('ctr') || column.metric.includes('rate')) {
        textColor = '#10B981'; // Verde para taxas/percentuais
      } else {
        textColor = '#3B82F6'; // Azul para contagens/números
      }
      
      doc.font(themeStyles.text.font) // Sem negrito para os valores
         .fillColor(textColor)
         .text(column.format(value), tableX + 5, tableY + 4, { 
            width: column.width - 5, 
            align: 'right' 
         });
      
      tableX += column.width + colSpacing;
    }
    
    tableY += tableRowHeight;
    
    // Verificar se precisa de nova página
    if (tableY > doc.page.height - 150) {
      doc.addPage();
      addReportFooter(doc, theme);
      
      // Resetar para o topo da nova página e redesenhar cabeçalho da tabela
      tableY = 50;
      
      // Cabeçalho na nova página
      doc.font(themeStyles.tableHeader.font)
         .fontSize(themeStyles.tableHeader.fontSize)
         .fillColor(themeStyles.tableHeader.color);
      
      tableX = 50;
      
      columns.forEach(column => {
        doc.text(column.name, tableX, tableY, { 
          width: column.width, 
          align: column.name === 'Data' ? 'left' : 'right' 
        });
        tableX += column.width + colSpacing;
      });
      
      // Linha horizontal após cabeçalho
      tableY += 20;
      doc.moveTo(50, tableY).lineTo(550, tableY).stroke();
      tableY += 10;
      
      doc.font(themeStyles.text.font)
         .fontSize(themeStyles.text.fontSize);
    }
  });

  // Adicionar rodapé com informações de geração
  addReportFooter(doc, theme);

  doc.end();

  // Aguardar que o stream termine de escrever o arquivo
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  // Limpar arquivos temporários de gráficos
  chartGenerator.cleanupCharts(chartPaths);

  // Copiar arquivo para a pasta pública para acesso direto
  const publicDir = path.join(__dirname, '../public/reports');
  
  // Garantir que o diretório existe
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  const publicFilePath = path.join(publicDir, `${reportId}.pdf`);
  console.log(`Copiando arquivo para ${publicFilePath}`);
  fs.copyFileSync(filePath, publicFilePath);
  
  // URL para acesso direto ao arquivo estático
  const reportUrl = `/reports/${reportId}.pdf`;
  console.log(`URL para acesso ao relatório: ${reportUrl}`);

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

  console.log(`Solicitação de download do relatório: ${reportId}`);

  // Verificar se o relatório existe
  if (!reports[reportId]) {
    console.log(`Relatório não encontrado: ${reportId}`);
    return next(new ErrorResponse('Relatório não encontrado ou expirado', 404));
  }

  const report = reports[reportId];
  console.log(`Relatório encontrado: ${report.reportName}`);

  // Verificar se o relatório expirou
  if (new Date() > report.expiresAt) {
    console.log(`Relatório expirado: ${reportId}`);
    try {
      fs.unlinkSync(report.filePath);
    } catch (error) {
      console.error(`Erro ao remover arquivo expirado ${report.filePath}:`, error);
    }
    delete reports[reportId];
    return next(new ErrorResponse('O link para este relatório expirou', 410));
  }

  // Verificar se o arquivo existe
  if (!fs.existsSync(report.filePath)) {
    console.log(`Arquivo do relatório não encontrado: ${report.filePath}`);
    return next(new ErrorResponse('Arquivo do relatório não encontrado', 404));
  }

  console.log(`Enviando arquivo: ${report.filePath}`);

  // Configuração de cabeçalhos para garantir que o arquivo seja baixado corretamente
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${report.reportName}.pdf"`);
  res.setHeader('Content-Length', fs.statSync(report.filePath).size);
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Enviar o arquivo usando o método mais simples e direto
  const fileStream = fs.createReadStream(report.filePath);
  fileStream.on('error', err => {
    console.error(`Erro ao ler o arquivo: ${err.message}`);
    return next(new ErrorResponse('Erro ao ler o arquivo do relatório', 500));
  });
  
  return fileStream.pipe(res);
});

/**
 * @desc    Fazer download direto do relatório PDF
 * @route   GET /api/reports/download/:reportId
 * @access  Public (com ID do relatório)
 */
const downloadReport = asyncHandler(async (req, res, next) => {
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

  // Log para depuração
  console.log(`Servindo PDF diretamente: ${report.filePath}`);

  // Enviar o arquivo diretamente com sendFile - abordagem mais simples e robusta
  res.sendFile(report.filePath, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${report.reportName}.pdf"`,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
});

/**
 * @desc    Método direto e simples para download de PDF (solução final)
 * @route   GET /api/reports/pdf/:reportId
 * @access  Public
 */
const downloadPdf = asyncHandler(async (req, res, next) => {
  const { reportId } = req.params;
  
  console.log(`Tentando download direto do PDF: ${reportId}`);

  // Verificar se o relatório existe
  if (!reports[reportId]) {
    console.log(`Relatório não encontrado: ${reportId}`);
    return next(new ErrorResponse('Relatório não encontrado ou expirado', 404));
  }

  const report = reports[reportId];
  console.log(`Relatório encontrado: ${JSON.stringify(report)}`);

  // Verificar se o relatório expirou
  if (new Date() > report.expiresAt) {
    console.log(`Relatório expirado: ${reportId}`);
    delete reports[reportId];
    return next(new ErrorResponse('O link para este relatório expirou', 410));
  }

  // Verificar se o arquivo existe
  if (!fs.existsSync(report.filePath)) {
    console.log(`Arquivo não encontrado: ${report.filePath}`);
    return next(new ErrorResponse('Arquivo do relatório não encontrado', 404));
  }

  console.log(`Enviando arquivo: ${report.filePath}`);
  
  // Abordagem mais direta e simples - enviar o arquivo
  return res.download(
    report.filePath, 
    `${report.reportName}.pdf`,
    {
      headers: {
        'Content-Type': 'application/pdf'
      }
    }
  );
});

/**

/**
 * Função para adicionar rodapé padrão ao relatório
 */
const addReportFooter = (doc, theme) => {
  const themeStyles = getThemeStyles(theme);
  const { width, height } = doc.page;
  
  // Linha horizontal fina (mais próxima da margem inferior)
  doc.moveTo(50, height - 20)
     .lineTo(width - 50, height - 20)
     .lineWidth(0.3) // Mais fina
     .stroke();
  
  // Rodapé extremamente compacto - tudo em uma única linha
  doc.fontSize(6) // Fonte bem pequena
     .font(themeStyles.text.font)
     .fillColor('#999999') // Cor mais clara
     .text(
       `Gerado em: ${moment().format('DD/MM/YYYY HH:mm')}`, 
       50, 
       height - 15, 
       { align: 'left', width: 150, continued: true }
     )
     .text(
       'Meta Ads Dashboard', 
       { align: 'center', width: 200, continued: true }
     )
     .text(
       `Pág ${doc._pageNumber || 1}`, 
       { align: 'right', width: 150 }
     );
};

/**
 * Retorna configurações de estilo com base no tema selecionado
 */
function getThemeStyles(theme) {
  const baseStyles = {
    // Estilos base aplicáveis a todos os temas
    text: {
      font: 'Helvetica',
      fontSize: 12,
      color: '#333333'
    },
    metricValue: {
      color: '#000000'
    },
    tableHeader: {
      font: 'Helvetica-Bold',
      fontSize: 10,
      color: '#333333'
    },
    tableText: {
      font: 'Helvetica',
      fontSize: 10,
      color: '#333333'
    },
    tableBorder: {
      color: '#CCCCCC',
      width: 0.5
    },
    tableRow: {
      alternateBackground: '#F9F9F9'
    },
    footer: {
      font: 'Helvetica',
      fontSize: 8,
      color: '#666666',
      lineColor: '#DDDDDD'
    }
  };
  
  // Temas específicos
  const themes = {
    default: {
      ...baseStyles,
      title: {
        font: 'Helvetica-Bold',
        fontSize: 20,
        color: '#000000'
      },
      subtitle: {
        font: 'Helvetica',
        fontSize: 12,
        color: '#333333'
      },
      info: {
        font: 'Helvetica',
        fontSize: 10,
        color: '#666666'
      },
      sectionTitle: {
        fontSize: 16,
        color: '#000000',
        underline: true
      }
    },
    modern: {
      ...baseStyles,
      headerBackground: '#4361EE',
      title: {
        font: 'Helvetica-Bold',
        fontSize: 24,
        color: '#FFFFFF'
      },
      subtitle: {
        font: 'Helvetica',
        fontSize: 14,
        color: '#FFFFFF'
      },
      info: {
        font: 'Helvetica',
        fontSize: 12,
        color: '#E6E6FF'
      },
      sectionTitle: {
        fontSize: 18,
        color: '#4361EE',
        underline: false
      },
      metricValue: {
        color: '#4361EE'
      },
      tableHeader: {
        font: 'Helvetica-Bold',
        fontSize: 11,
        color: '#4361EE'
      },
      tableBorder: {
        color: '#4361EE',
        width: 1
      }
    },
    minimal: {
      ...baseStyles,
      title: {
        font: 'Helvetica-Bold',
        fontSize: 18,
        color: '#000000'
      },
      subtitle: {
        font: 'Helvetica',
        fontSize: 12,
        color: '#666666'
      },
      info: {
        font: 'Helvetica',
        fontSize: 10,
        color: '#888888'
      },
      sectionTitle: {
        fontSize: 14,
        color: '#000000',
        underline: false
      },
      tableRow: {
        alternateBackground: '#FFFFFF'
      }
    }
  };
  
  return themes[theme] || themes.default;
}

module.exports = {
  generateMetricsReport,
  getReport,
  downloadReport,
  downloadPdf
};
