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
import DateRangeSelector from './DateRangeSelector'; // Reativado
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
  
  // Estado para controlar quais mu00e9tricas estu00e3o selecionadas para exibiu00e7u00e3o nos gru00e1ficos
  const [selectedMetrics, setSelectedMetrics] = useState({
    // Gru00e1fico de barras
    impressions: true,
    clicks: true,
    reach: false,
    conversions: false,
    // Gru00e1fico de linha
    spend: true,
    ctr: true,
    cpc: false,
    cpm: false
  });

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
          ['Gastos', `R$ ${totalMetrics.spend.toFixed(2)}`],
          ['CPC', `R$ ${totalMetrics.cpc.toFixed(2)}`],
          ['CPM', `R$ ${totalMetrics.cpm.toFixed(2)}`],
          ['CTR', `${totalMetrics.ctr.toFixed(2)}%`],
          ['Alcance', totalMetrics.reach.toLocaleString()],
          ['Conversões', totalMetrics.conversions.toLocaleString()],
          ['Custo por Conversão', `R$ ${totalMetrics.cost_per_conversion.toFixed(2)}`]
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
          ['Data', 'Impressões', 'Cliques', 'Gastos (R$)', 'CTR (%)', 'CPC (R$)']
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

  // Uma solução simples: um único useEffect com um botão manual
  // para carregar os dados, evitando loops infinitos de renderização
  useEffect(() => {
    // Carregar dados apenas uma vez na montagem inicial
    if (companyId && adAccountId) {
      console.log('MetricsDashboard montado - dados serão carregados manualmente');
      // Não chame loadMetrics automaticamente!
    }
  }, []); // Array de dependências vazio = executa apenas na montagem

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
          reach: item.metrics.reach || 0,
          conversions: item.metrics.conversions || 0,
          spend: parseFloat(item.metrics.spend.toFixed(2)),
          ctr: parseFloat((item.metrics.ctr).toFixed(2)),
          cpc: item.metrics.cpc ? parseFloat(item.metrics.cpc.toFixed(2)) : 0,
          cpm: item.metrics.cpm ? parseFloat(item.metrics.cpm.toFixed(2)) : 0
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
      
      {/* Reativando DateRangeSelector com funcionalidade completa */}
      <Box sx={{ mb: 3 }}>
        <DateRangeSelector 
          initialRange={dateRange} 
          onChange={(newDateRange) => {
            console.log('Novo período selecionado:', newDateRange);
            setDateRange(newDateRange);
            // Carregar dados com o novo intervalo de datas
            loadMetrics(false);
          }}
        />
      </Box>
      
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
                    R$ {totalMetrics.spend.toFixed(2)}
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
                    R$ {totalMetrics.cpc.toFixed(2)}
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
                    R$ {totalMetrics.cpm.toFixed(2)}
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
          
          {/* Controles de seleção de métricas */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Selecione as métricas para visualização:
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Gráfico 1 (Barras):
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Button 
                    variant={selectedMetrics.impressions ? "contained" : "outlined"}
                    color="primary"
                    size="small"
                    onClick={() => setSelectedMetrics(prev => ({...prev, impressions: !prev.impressions}))}
                  >
                    Impressões
                  </Button>
                  <Button 
                    variant={selectedMetrics.clicks ? "contained" : "outlined"}
                    color="primary"
                    size="small"
                    onClick={() => setSelectedMetrics(prev => ({...prev, clicks: !prev.clicks}))}
                  >
                    Cliques
                  </Button>
                  <Button 
                    variant={selectedMetrics.reach ? "contained" : "outlined"}
                    color="primary"
                    size="small"
                    onClick={() => setSelectedMetrics(prev => ({...prev, reach: !prev.reach}))}
                  >
                    Alcance
                  </Button>
                  <Button 
                    variant={selectedMetrics.conversions ? "contained" : "outlined"}
                    color="primary"
                    size="small"
                    onClick={() => setSelectedMetrics(prev => ({...prev, conversions: !prev.conversions}))}
                  >
                    Conversões
                  </Button>
                </Stack>
              </Box>
              
              <Box>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Gráfico 2 (Linhas):
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Button 
                    variant={selectedMetrics.spend ? "contained" : "outlined"}
                    color="secondary"
                    size="small"
                    onClick={() => setSelectedMetrics(prev => ({...prev, spend: !prev.spend}))}
                  >
                    Gastos
                  </Button>
                  <Button 
                    variant={selectedMetrics.ctr ? "contained" : "outlined"}
                    color="secondary"
                    size="small"
                    onClick={() => setSelectedMetrics(prev => ({...prev, ctr: !prev.ctr}))}
                  >
                    CTR
                  </Button>
                  <Button 
                    variant={selectedMetrics.cpc ? "contained" : "outlined"}
                    color="secondary"
                    size="small"
                    onClick={() => setSelectedMetrics(prev => ({...prev, cpc: !prev.cpc}))}
                  >
                    CPC
                  </Button>
                  <Button 
                    variant={selectedMetrics.cpm ? "contained" : "outlined"}
                    color="secondary"
                    size="small"
                    onClick={() => setSelectedMetrics(prev => ({...prev, cpm: !prev.cpm}))}
                  >
                    CPM
                  </Button>
                </Stack>
              </Box>
            </Box>
            
            {/* Nota informativa */}
            <Typography variant="caption" color="text.secondary">
              Clique nas métricas acima para adicionar ou remover do gráfico correspondente.
            </Typography>
          </Box>
          
          {/* Gráficos */}
          <Grid container spacing={3} sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)' }}>
            <Grid sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Métricas de Volume ao Longo do Tempo
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
                    {selectedMetrics.impressions && (
                      <Bar yAxisId="left" dataKey="impressions" name="Impressões" fill="#8884d8" />
                    )}
                    {selectedMetrics.clicks && (
                      <Bar yAxisId="right" dataKey="clicks" name="Cliques" fill="#82ca9d" />
                    )}
                    {selectedMetrics.reach && (
                      <Bar yAxisId="left" dataKey="reach" name="Alcance" fill="#ff8042" />
                    )}
                    {selectedMetrics.conversions && (
                      <Bar yAxisId="right" dataKey="conversions" name="Conversões" fill="#0088FE" />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Mu00e9tricas de Desempenho ao Longo do Tempo
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
                    {selectedMetrics.spend && (
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="spend" 
                        name="Gastos (R$)" 
                        stroke="#ff7300" 
                        activeDot={{ r: 8 }} 
                      />
                    )}
                    {selectedMetrics.ctr && (
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="ctr" 
                        name="CTR (%)" 
                        stroke="#387908"
                      />
                    )}
                    {selectedMetrics.cpc && (
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="cpc" 
                        name="CPC (R$)" 
                        stroke="#0088FE"
                      />
                    )}
                    {selectedMetrics.cpm && (
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="cpm" 
                        name="CPM (R$)" 
                        stroke="#FF8042"
                      />
                    )}
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
