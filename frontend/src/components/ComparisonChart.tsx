import React, { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, ChartData, registerables } from 'chart.js';
import { Box } from '@mui/material';

// Registrar os componentes necessários do Chart.js
Chart.register(...registerables);

interface ComparisonChartProps {
  data: any[];
  metrics: string[];
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({ data, metrics }) => {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  // Cores para as diferentes métricas
  const colors = [
    '#2196F3', // Azul
    '#FF9800', // Laranja
    '#4CAF50', // Verde
    '#F44336', // Vermelho
    '#9C27B0', // Roxo
    '#795548', // Marrom
    '#00BCD4', // Ciano
    '#FFEB3B', // Amarelo
  ];

  // Mapeia métricas para rótulos amigáveis
  const metricLabels: Record<string, string> = {
    impressions: 'Impressões',
    clicks: 'Cliques',
    spend: 'Investimento (R$)',
    reach: 'Alcance',
    ctr: 'CTR (%)',
    cpc: 'CPC (R$)',
    cpm: 'CPM (R$)',
    frequency: 'Frequência',
    conversions: 'Conversões',
    purchases: 'Compras',
    unique_clicks: 'Cliques Únicos'
  };

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0 || metrics.length === 0) return;

    // Destruir gráfico anterior se existir
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Calcular totais para cada métrica
    const totals = metrics.reduce((acc, metric) => {
      // Somar todos os valores da métrica
      const total = data.reduce((sum, day) => {
        const value = day.metrics[metric];
        return sum + (value !== undefined ? Number(value) : 0);
      }, 0);
      
      acc[metric] = total;
      return acc;
    }, {} as Record<string, number>);

    const chartData: ChartData = {
      labels: metrics.map(metric => metricLabels[metric] || metric),
      datasets: [
        {
          label: 'Métricas Totais',
          data: metrics.map(metric => totals[metric]),
          backgroundColor: metrics.map((_, index) => colors[index % colors.length]),
          borderColor: metrics.map((_, index) => 
            colors[index % colors.length].replace(')', ', 1)')
          ),
          borderWidth: 1
        }
      ]
    };

    // Determinar se usamos gráfico de barras ou linha com base no número de métricas
    const chartType = metrics.length > 2 ? 'bar' : 'line';

    const config: ChartConfiguration = {
      type: chartType,
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: chartType === 'bar' ? 'x' : 'x',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            titleColor: '#333',
            bodyColor: '#555',
            borderWidth: 1,
            borderColor: '#ddd',
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            },
            padding: 12,
            callbacks: {
              label: function(context) {
                const metricIndex = context.dataIndex;
                const metric = metrics[metricIndex];
                const value = context.raw as number;
                
                // Formatar o valor de acordo com o tipo de métrica
                if (metric === 'ctr') {
                  return `${value.toFixed(2)}%`;
                } else if (['spend', 'cpc', 'cpm'].includes(metric)) {
                  return `R$ ${value.toFixed(2)}`;
                } else if (metric === 'frequency') {
                  return value.toFixed(2);
                } else {
                  return value.toLocaleString('pt-BR');
                }
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: function(value) {
                if (value >= 1000000) {
                  return (Number(value) / 1000000).toFixed(1) + 'M';
                } else if (value >= 1000) {
                  return (Number(value) / 1000).toFixed(1) + 'k';
                }
                return value;
              }
            }
          }
        }
      }
    };

    // Criar novo gráfico
    chartInstance.current = new Chart(ctx, config);

    // Cleanup ao desmontar
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, metrics]);

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <canvas ref={chartRef} />
    </Box>
  );
};

export default ComparisonChart;
