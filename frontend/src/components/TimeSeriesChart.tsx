import React, { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration, ChartData, registerables } from 'chart.js';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Box } from '@mui/material';

// Registrar os componentes necessários do Chart.js
Chart.register(...registerables);

interface TimeSeriesChartProps {
  data: any[];
  metrics: string[];
}

const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({ data, metrics }) => {
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
    '#607D8B', // Azul acinzentado
    '#E91E63'  // Rosa
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

    // Ordenar os dados por data
    const sortedData = [...data].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Preparar dados para o gráfico
    const dates = sortedData.map(item => format(new Date(item.date), 'dd/MM', { locale: ptBR }));
    
    const datasets = metrics.map((metric, index) => {
      const values = sortedData.map(item => {
        // Alguns valores podem estar em formato de string, convertemos para número
        const rawValue = item.metrics[metric];
        return rawValue !== undefined ? Number(rawValue) : 0;
      });

      return {
        label: metricLabels[metric] || metric,
        data: values,
        borderColor: colors[index % colors.length],
        backgroundColor: `${colors[index % colors.length]}33`, // Adiciona transparência
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5
      };
    });

    const chartData: ChartData = {
      labels: dates,
      datasets
    };

    const config: ChartConfiguration = {
      type: 'line',
      data: chartData,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            mode: 'index',
            intersect: false,
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
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true
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
                const numValue = Number(value);
                if (numValue >= 1000) {
                  return (numValue / 1000).toFixed(1) + 'k';
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

export default TimeSeriesChart;
