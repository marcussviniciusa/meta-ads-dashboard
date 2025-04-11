import { useState, useEffect, useCallback } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  CircularProgress,
  Stack,
  Alert,
  Paper
} from '@mui/material';
import { Grid } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import DateRangeSelector from './DateRangeSelector';
import { metricsService } from '../services/metricsService';
import { jsPDF } from 'jspdf';
// @ts-ignore
import 'jspdf-autotable';
import moment from 'moment';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface MetricsDashboardProps {
  companyId: string;
  adAccountId: string;
  adAccountName?: string;
}

interface DateRange {
  startDate: string;
  endDate: string;
}

const MetricsDashboard = ({ companyId, adAccountId, adAccountName }: MetricsDashboardProps) => {
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: moment().subtract(30, 'days').format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD')
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [totalMetrics, setTotalMetrics] = useState<any>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);

  // Carregar métricas - usando useCallback para evitar recriação da função a cada renderização
  const loadMetrics = useCallback(async (forceRefresh = false) => {
    // Verifica se temos os parâmetros necessários
    if (!companyId || !adAccountId) {
      console.log('[MetricsDashboard] Parâmetros insuficientes para carregar métricas');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`[MetricsDashboard] Carregando métricas para ${companyId}/${adAccountId}`, forceRefresh ? '(forçando atualização)' : '');
      const response = await metricsService.getMetrics(companyId, adAccountId, {
        ...dateRange,
        forceRefresh
      });
      
      if (response.success && response.data.length > 0) {
        setMetrics(response.data);
        
        // Calcular métricas totais
        const totals = metricsService.calculateTotalMetrics(response.data);
        setTotalMetrics(totals);
        
        // Definir a última atualização
        setLastSynced(response.data[0]?.syncInfo?.syncedAt || new Date().toISOString());
      } else {
        setMetrics([]);
        setTotalMetrics(null);
        setError('Sem dados disponíveis para o período selecionado');
      }
    } catch (err) {
      console.error('Erro ao carregar métricas:', err);
      setError('Ocorreu um erro ao carregar as métricas. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [companyId, adAccountId, dateRange]); // Dependências do useCallback

  // Sincronizar métricas manualmente
  const handleRefresh = () => {
    loadMetrics(true);
  };

  // Gerar PDF com o relatório
  const generatePDF = () => {
    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.text('Relatório de Métricas de Anúncios', 14, 22);
      
      // Informações da conta
      doc.setFontSize(12);
      doc.text(`Conta: ${adAccountName || adAccountId}`, 14, 32);
      doc.text(`Período: ${moment(dateRange.startDate).format('DD/MM/YYYY')} - ${moment(dateRange.endDate).format('DD/MM/YYYY')}`, 14, 39);
      doc.text(`Gerado em: ${moment().format('DD/MM/YYYY HH:mm')}`, 14, 46);
      
      // Métricas totais
      doc.setFontSize(14);
      doc.text('Resumo de Métricas', 14, 56);
      
      if (totalMetrics) {
        const tableData = [
          ['Métrica', 'Valor'],
          ['Impressões', totalMetrics.impressions.toLocaleString()],
          ['Cliques', totalMetrics.clicks.toLocaleString()],
          ['Gastos', `$${totalMetrics.spend.toFixed(2)}`],
          ['CPC', `$${totalMetrics.cpc.toFixed(2)}`],
          ['CPM', `$${totalMetrics.cpm.toFixed(2)}`],
          ['CTR', `${totalMetrics.ctr.toFixed(2)}%`],
          ['Alcance', totalMetrics.reach.toLocaleString()],
          ['Conversões', totalMetrics.conversions.toLocaleString()],
          ['Custo por Conversão', `$${totalMetrics.cost_per_conversion.toFixed(2)}`]
        ];
        
        // @ts-ignore
        doc.autoTable({
          startY: 60,
          head: [tableData[0]],
          body: tableData.slice(1),
          theme: 'grid',
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 139, 202] },
        });
      }
      
      // Dados diários
      const dailyData = metricsService.aggregateMetricsByPeriod(metrics);
      
      if (dailyData.length > 0) {
        // @ts-ignore
        const startY = doc.lastAutoTable.finalY + 15;
        
        doc.setFontSize(14);
        doc.text('Dados Diários', 14, startY);
        
        const dailyTableData = [
          ['Data', 'Impressões', 'Cliques', 'Gastos ($)', 'CTR (%)', 'CPC ($)']
        ];
        
        dailyData.forEach(item => {
          dailyTableData.push([
            moment(item.date).format('DD/MM/YYYY'),
            item.impressions.toLocaleString(),
            item.clicks.toLocaleString(),
            item.spend.toFixed(2),
            item.ctr.toFixed(2),
            item.cpc.toFixed(2)
          ]);
        });
        
        // @ts-ignore
        doc.autoTable({
          startY: startY + 5,
          head: [dailyTableData[0]],
          body: dailyTableData.slice(1),
          theme: 'grid',
          styles: { fontSize: 9 },
          headStyles: { fillColor: [66, 139, 202] },
        });
      }
      
      // Salvar o PDF
      doc.save(`relatorio_${adAccountId}_${moment().format('YYYYMMDD')}.pdf`);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      setError('Ocorreu um erro ao gerar o relatório PDF');
    }
  };

  // Atualizar métricas quando o intervalo de datas ou os IDs mudarem
  useEffect(() => {
    if (companyId && adAccountId) {
      loadMetrics();
    }
  }, [loadMetrics]); // Como loadMetrics já tem as dependências corretas, basta incluí-lo aqui

  // Preparar dados para o gráfico
  const prepareChartData = () => {
    // Log para diagnóstico
    console.log('Dados de métricas originais:', metrics.map(m => ({
      data_original: m.date,
      data_formatada: moment(m.date).format('YYYY-MM-DD')
    })));
    
    const chartData = metrics
      .map(item => {
        // Usar UTC para evitar problemas de timezone
        const metricDate = moment.utc(item.date);
        
        return {
          // Data para exibição no formato DD/MM
          date: metricDate.format('DD/MM'),
          // Data para ordenação e uso nos eixos
          fullDate: metricDate.format('YYYY-MM-DD'),
          // Versão numérica para comparação
          dateNumber: parseInt(metricDate.format('YYYYMMDD')),
          impressions: item.metrics.impressions,
          clicks: item.metrics.clicks,
          spend: parseFloat(item.metrics.spend.toFixed(2)),
          ctr: parseFloat((item.metrics.ctr).toFixed(2))
        };
      })
      // Ordenação por número para garantir a sequência correta
      .sort((a, b) => a.dateNumber - b.dateNumber);
    
    console.log('Dados preparados para o gráfico:', chartData);
    return chartData;
  };

  const chartData = prepareChartData();

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Dashboard de Métricas
          {adAccountName && ` - ${adAccountName}`}
        </Typography>
        
        <Stack direction="row" spacing={2}>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />} 
            onClick={handleRefresh}
            disabled={loading}
          >
            Atualizar
          </Button>
          <Button 
            variant="contained" 
            startIcon={<DownloadIcon />} 
            onClick={generatePDF}
            disabled={loading || !metrics.length}
          >
            Gerar PDF
          </Button>
        </Stack>
      </Box>
      
      <DateRangeSelector onChange={setDateRange} />
      
      {lastSynced && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Última atualização: {moment(lastSynced).format('DD/MM/YYYY HH:mm')}
          </Typography>
        </Box>
      )}
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      
      {error && !loading && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {!loading && !error && totalMetrics && (
        <>
          {/* Cards com métricas principais */}
          <Grid container spacing={3} sx={{ mb: 4, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)' }}>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Impressões
                  </Typography>
                  <Typography variant="h5" component="div">
                    {totalMetrics.impressions.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Cliques
                  </Typography>
                  <Typography variant="h5" component="div">
                    {totalMetrics.clicks.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Gastos
                  </Typography>
                  <Typography variant="h5" component="div">
                    ${totalMetrics.spend.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    CTR
                  </Typography>
                  <Typography variant="h5" component="div">
                    {totalMetrics.ctr.toFixed(2)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Segunda linha de cards com métricas */}
          <Grid container spacing={3} sx={{ mb: 4, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)' }}>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    CPC
                  </Typography>
                  <Typography variant="h5" component="div">
                    ${totalMetrics.cpc.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    CPM
                  </Typography>
                  <Typography variant="h5" component="div">
                    ${totalMetrics.cpm.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Alcance
                  </Typography>
                  <Typography variant="h5" component="div">
                    {totalMetrics.reach.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Conversões
                  </Typography>
                  <Typography variant="h5" component="div">
                    {totalMetrics.conversions?.toLocaleString() || "0"}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          {/* Gráficos */}
          <Grid container spacing={3} sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)' }}>
            <Grid sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Impressões e Cliques ao Longo do Tempo
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="dateNumber"
                      tickFormatter={(value) => {
                        // Converter o número de volta para uma data legível
                        const month = Math.floor((value % 10000) / 100);
                        const day = value % 100;
                        return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`;
                      }}
                      // Usar ticks específicos baseados nos valores disponíveis
                      ticks={chartData.map(item => item.dateNumber)}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      labelFormatter={(value) => {
                        // Extrair componentes da data do valor numerico
                        const year = Math.floor(value / 10000);
                        const month = Math.floor((value % 10000) / 100);
                        const day = value % 100;
                        return `Data: ${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="impressions" name="Impressões" fill="#8884d8" />
                    <Bar yAxisId="right" dataKey="clicks" name="Cliques" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Gastos e CTR ao Longo do Tempo
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="dateNumber"
                      tickFormatter={(value) => {
                        // Converter o número de volta para uma data legível
                        const month = Math.floor((value % 10000) / 100);
                        const day = value % 100;
                        return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}`;
                      }}
                      // Usar ticks específicos baseados nos valores disponíveis
                      ticks={chartData.map(item => item.dateNumber)}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip
                      labelFormatter={(value) => {
                        // Extrair componentes da data do valor numerico
                        const year = Math.floor(value / 10000);
                        const month = Math.floor((value % 10000) / 100);
                        const day = value % 100;
                        return `Data: ${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
                      }}
                    />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="spend" 
                      name="Gastos ($)" 
                      stroke="#ff7300" 
                      activeDot={{ r: 8 }} 
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="ctr" 
                      name="CTR (%)" 
                      stroke="#387908"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default MetricsDashboard;
