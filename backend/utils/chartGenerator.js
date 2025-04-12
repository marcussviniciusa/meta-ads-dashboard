const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

// Configurações para a geração de gráficos
const width = 800;
const height = 400;
const chartCallback = (ChartJS) => {
  // Personalização global do Chart.js
  ChartJS.defaults.font.family = 'Arial, Helvetica, sans-serif';
  ChartJS.defaults.font.size = 12;
  ChartJS.defaults.color = '#444';
  ChartJS.defaults.plugins.title.font.size = 16;
  ChartJS.defaults.plugins.title.font.weight = 'bold';
};

// Instanciar o gerador de gráficos
const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, chartCallback });

// Cores para os gráficos
const chartColors = [
  '#4361ee', // Azul principal
  '#f72585', // Rosa
  '#7209b7', // Roxo
  '#3a0ca3', // Roxo escuro
  '#4cc9f0', // Azul claro
  '#fb8500', // Laranja
  '#8ac926', // Verde
  '#ff595e', // Vermelho
  '#1982c4', // Azul médio
  '#6a4c93', // Lavanda
];

// Cores para gradientes
const gradients = [
  ['#4361ee', '#4cc9f0'], // Azul para ciano
  ['#f72585', '#7209b7'], // Rosa para roxo
  ['#fb8500', '#ffca3a'], // Laranja para amarelo
  ['#8ac926', '#c5e063'], // Verde para verde claro
  ['#ff595e', '#ffca3a'], // Vermelho para amarelo
];

/**
 * Cria um diretório temporário para os gráficos se não existir
 * @returns {string} Caminho para o diretório de gráficos
 */
const ensureChartDirectory = () => {
  const chartDir = path.join(__dirname, '../temp/charts');
  if (!fs.existsSync(chartDir)) {
    fs.mkdirSync(chartDir, { recursive: true });
  }
  return chartDir;
};

/**
 * Formata o título de uma métrica para exibição
 * @param {string} metric Chave da métrica
 * @returns {string} Título formatado
 */
const formatMetricTitle = (metric) => {
  const metricTitles = {
    impressions: 'Impressões',
    clicks: 'Cliques',
    spend: 'Investimento',
    reach: 'Alcance',
    ctr: 'CTR',
    cpc: 'CPC',
    cpm: 'CPM',
    frequency: 'Frequência',
    unique_clicks: 'Cliques Únicos',
    unique_ctr: 'CTR Único',
    cost_per_unique_click: 'Custo por Clique Único',
    conversions: 'Conversões',
    cost_per_conversion: 'Custo por Conversão',
    conversion_rate: 'Taxa de Conversão',
    purchases: 'Compras',
  };
  
  return metricTitles[metric] || metric;
};

/**
 * Gera um gráfico de linha para métricas ao longo do tempo
 * @param {Array} metrics Dados de métricas
 * @param {Array} selectedMetrics Lista de métricas selecionadas
 * @param {string} title Título do gráfico
 * @returns {Promise<string>} Caminho para o arquivo de imagem gerado
 */
const generateTimeSeriesChart = async (metrics, selectedMetrics, title = 'Desempenho ao Longo do Tempo') => {
  // Organizar os dados por data
  const dates = [...new Set(metrics.map(m => moment(m.date).format('DD/MM')))].sort((a, b) => 
    moment(a, 'DD/MM').diff(moment(b, 'DD/MM')));
  
  // Para cada métrica selecionada, criar um dataset
  const datasets = [];
  
  selectedMetrics.forEach((metricKey, index) => {
    // Obter valores para cada data
    const data = dates.map(date => {
      const metricsForDate = metrics.filter(m => moment(m.date).format('DD/MM') === date);
      // Somar os valores para o mesmo dia (pode haver múltiplos registros)
      return metricsForDate.reduce((sum, m) => sum + (m.metrics[metricKey] || 0), 0);
    });
    
    // Usar cor com opacidade
    const color = chartColors[index % chartColors.length];
    
    datasets.push({
      label: formatMetricTitle(metricKey),
      data,
      borderColor: color,
      backgroundColor: color + '33', // Adicionar transparência
      fill: true,
      tension: 0.3, // Suavização da linha
      pointRadius: 4,
      pointHoverRadius: 6,
    });
  });
  
  // Configuração do gráfico
  const configuration = {
    type: 'line',
    data: {
      labels: dates,
      datasets
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: title,
          padding: {
            top: 10,
            bottom: 20
          }
        },
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          padding: 10,
          bodySpacing: 5,
          titleFont: {
            size: 13,
            weight: 'bold'
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          },
          title: {
            display: true,
            text: 'Data'
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          },
          title: {
            display: true,
            text: 'Valor'
          }
        }
      },
    }
  };
  
  // Gerar a imagem
  const chartDir = ensureChartDirectory();
  const chartFilename = `timeseries_${Date.now()}.png`;
  const chartPath = path.join(chartDir, chartFilename);
  
  const image = await chartJSNodeCanvas.renderToBuffer(configuration);
  fs.writeFileSync(chartPath, image);
  
  return chartPath;
};

/**
 * Gera um gráfico de barras para comparação de métricas
 * @param {Array} metrics Dados de métricas
 * @param {Array} selectedMetrics Lista de métricas selecionadas
 * @param {string} title Título do gráfico
 * @returns {Promise<string>} Caminho para o arquivo de imagem gerado
 */
const generateComparisonChart = async (metrics, selectedMetrics, title = 'Comparação de Métricas') => {
  // Calcular totais para cada métrica
  const metricTotals = selectedMetrics.reduce((acc, metricKey) => {
    const total = metrics.reduce((sum, item) => sum + (item.metrics[metricKey] || 0), 0);
    acc[metricKey] = total;
    return acc;
  }, {});
  
  // Preparar dados para o gráfico
  const labels = selectedMetrics.map(metricKey => formatMetricTitle(metricKey));
  const data = selectedMetrics.map(metricKey => metricTotals[metricKey]);
  
  // Criar gradientes para as barras
  const backgroundColors = selectedMetrics.map((_, index) => {
    const gradientPair = gradients[index % gradients.length];
    return {
      start: gradientPair[0],
      end: gradientPair[1]
    };
  });
  
  // Configuração do gráfico
  const configuration = {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Total',
          data,
          backgroundColor: chartColors.map(color => color + 'CC'), // Adiciona transparência
          borderColor: chartColors,
          borderWidth: 1,
          borderRadius: 6,
          barThickness: 40,
          maxBarThickness: 60
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: title,
          padding: {
            top: 10,
            bottom: 30
          },
          font: {
            size: 18
          }
        },
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const metricKey = selectedMetrics[context.dataIndex];
              const value = context.raw;
              
              // Formatar valores conforme o tipo de métrica
              if (metricKey.includes('ctr') || metricKey.includes('rate')) {
                return `${value.toFixed(2)}%`;
              } else if (metricKey.includes('spend') || metricKey.includes('cost')) {
                return `R$ ${value.toFixed(2)}`;
              } else {
                return value.toLocaleString('pt-BR');
              }
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: '#f0f0f0'
          },
          ticks: {
            font: {
              size: 12
            }
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            font: {
              size: 11
            }
          }
        }
      },
      layout: {
        padding: {
          left: 10,
          right: 10,
          top: 0,
          bottom: 10
        }
      }
    }
  };
  
  // Gerar a imagem
  const chartDir = ensureChartDirectory();
  const chartFilename = `comparison_${Date.now()}.png`;
  const chartPath = path.join(chartDir, chartFilename);
  
  const image = await chartJSNodeCanvas.renderToBuffer(configuration);
  fs.writeFileSync(chartPath, image);
  
  return chartPath;
};

/**
 * Gera um gráfico de pizza para distribuição de custos
 * @param {Array} metrics Dados de métricas
 * @param {string} title Título do gráfico
 * @returns {Promise<string>} Caminho para o arquivo de imagem gerado
 */
const generatePieChart = async (metrics, title = 'Distribuição de Custos') => {
  // Agrupar dados por campanha ou outra dimensão
  const groupedData = {};
  
  metrics.forEach(metric => {
    const key = metric.objectName || metric.objectId;
    if (!groupedData[key]) {
      groupedData[key] = 0;
    }
    groupedData[key] += metric.metrics.spend || 0;
  });
  
  // Ordenar por valor e pegar os top 5, agrupando o resto como "Outros"
  const sortedEntries = Object.entries(groupedData)
    .sort((a, b) => b[1] - a[1]);
  
  let labels = [];
  let data = [];
  let totalOthers = 0;
  
  sortedEntries.forEach((entry, index) => {
    if (index < 5) {
      labels.push(entry[0]);
      data.push(entry[1]);
    } else {
      totalOthers += entry[1];
    }
  });
  
  // Adicionar "Outros" se necessário
  if (totalOthers > 0) {
    labels.push('Outros');
    data.push(totalOthers);
  }
  
  // Cores para o gráfico
  const backgroundColors = chartColors.slice(0, labels.length);
  
  // Configuração do gráfico
  const configuration = {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: backgroundColors,
        borderColor: '#ffffff',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: title,
          padding: {
            top: 10,
            bottom: 20
          }
        },
        legend: {
          position: 'right',
          labels: {
            usePointStyle: true,
            padding: 15
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = context.parsed;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((value * 100) / total).toFixed(1);
              const formattedValue = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(value);
              return `${formattedValue} (${percentage}%)`;
            }
          }
        }
      }
    }
  };
  
  // Gerar a imagem
  const chartDir = ensureChartDirectory();
  const chartFilename = `piechart_${Date.now()}.png`;
  const chartPath = path.join(chartDir, chartFilename);
  
  const image = await chartJSNodeCanvas.renderToBuffer(configuration);
  fs.writeFileSync(chartPath, image);
  
  return chartPath;
};

/**
 * Limpa arquivos temporários de gráficos
 * @param {Array} filePaths Lista de caminhos de arquivos para excluir
 */
const cleanupCharts = (filePaths) => {
  filePaths.forEach(filePath => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`Erro ao remover arquivo temporário: ${filePath}`, error);
    }
  });
};

module.exports = {
  generateTimeSeriesChart,
  generateComparisonChart,
  generatePieChart,
  cleanupCharts
};
