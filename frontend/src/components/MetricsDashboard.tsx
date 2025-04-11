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
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Tooltip,
  Snackbar
} from '@mui/material';
import { Grid } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ShareIcon from '@mui/icons-material/Share';
import FileCopyIcon from '@mui/icons-material/FileCopy';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import DateRangeSelector from './DateRangeSelector'; // Reativado
import { metricsService } from '../services/metricsService';
import { reportService } from '../services/reportService';
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';
import moment from 'moment';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

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
  
  // Estados para a funcionalidade de compartilhamento de relatu00f3rio
  const [shareDialogOpen, setShareDialogOpen] = useState<boolean>(false);
  const [reportName, setReportName] = useState<string>('');
  const [generatingReport, setGeneratingReport] = useState<boolean>(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<{reportId: string, reportUrl: string, reportName: string, expiresAt: string} | null>(null);
  const [reportLinkCopied, setReportLinkCopied] = useState<boolean>(false);
  
  // Estado para controlar quais mu00e9tricas estu00e3o selecionadas para exibiu00e7u00e3o nos gru00e1ficos
  const [selectedMetrics, setSelectedMetrics] = useState({
    // Gru00e1fico de barras
    impressions: true,
    clicks: true,
    reach: false,
    conversions: false,
    purchases: false,
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
        // Log detalhado para analisar estrutura de dados das métricas
        console.log('Dados brutos de métricas recebidos:', JSON.stringify(response.data, null, 2));
        console.log('Procurando dados de compras nas métricas:', response.data.map(metricDay => ({
          data: metricDay.date,
          compras_direta: metricDay.metrics.purchases,
          acoes: metricDay.metrics.actions,
          actionTypes: metricDay.metrics.actions ? metricDay.metrics.actions.map(a => a.action_type) : [],
          additionalMetrics: metricDay.additionalMetrics
        })));
        
        setMetrics(response.data);
        
        // Calcular métricas totais
        const totals = metricsService.calculateTotalMetrics(response.data);
        console.log('Métricas totais calculadas:', totals);
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
      // Verifica se há dados para gerar o relatório
      if (!metrics || !metrics.length || !totalMetrics) {
        console.error('Sem dados para gerar o relatório PDF');
        return;
      }

      // Criar nova instância do PDF
      const doc = new jsPDF();
      
      // Adicionar título
      doc.setFontSize(18);
      doc.text('Relatório de Métricas de Anúncios', 14, 22);
      
      // Adicionar informações da conta
      doc.setFontSize(12);
      doc.text(`Conta: ${adAccountName || adAccountId}`, 14, 30);
      doc.text(`Período: ${moment(dateRange.startDate).format('DD/MM/YYYY')} a ${moment(dateRange.endDate).format('DD/MM/YYYY')}`, 14, 38);
      
      // Tabela com métricas gerais
      doc.setFontSize(14);
      doc.text('Resumo Geral', 14, 50);
      
      // Dados para tabela de resumo
      const generalData = [
        ['Impressões', totalMetrics.impressions.toLocaleString('pt-BR')],
        ['Cliques', totalMetrics.clicks.toLocaleString('pt-BR')],
        ['CTR', `${totalMetrics.ctr.toFixed(2)}%`],
        ['Alcance', totalMetrics.reach.toLocaleString('pt-BR')],
        ['Frequência', totalMetrics.frequency.toFixed(2)],
        ['Gastos', `R$ ${totalMetrics.spend.toFixed(2)}`],
        ['CPC', `R$ ${totalMetrics.cpc.toFixed(2)}`],
        ['CPM', `R$ ${totalMetrics.cpm.toFixed(2)}`],
        ['Compras', totalMetrics.purchases.toLocaleString('pt-BR')]
      ];

      // Adicionar tabela de resumo geral
      autoTable(doc, {
        startY: 55,
        head: [['Métrica', 'Valor']],
        body: generalData,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202] }
      });
      
      // Recuperar posição Y após a primeira tabela
      const finalY = (doc as any).lastAutoTable.finalY;
      
      // Adicionar tabela diária
      doc.setFontSize(14);
      doc.text('Métricas Diárias', 14, finalY + 15);
      
      // Dados para tabela diária
      const dailyData = metrics.map((item: any) => [
        moment(item.date).format('DD/MM/YYYY'),
        item.metrics.impressions.toLocaleString('pt-BR'),
        item.metrics.clicks.toLocaleString('pt-BR'),
        `${item.metrics.ctr.toFixed(2)}%`,
        `R$ ${item.metrics.spend.toFixed(2)}`,
        extractPurchasesData(item).toLocaleString('pt-BR')
      ]);
      
      // Inverter ordem da tabela diária para mostrar datas mais recentes primeiro
      dailyData.reverse();
      
      // Adicionar tabela diária
      autoTable(doc, {
        startY: finalY + 20,
        head: [['Data', 'Impressões', 'Cliques', 'CTR', 'Gastos', 'Compras']],
        body: dailyData,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202] }
      });
      
      // Rodapé
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.text(`Gerado em: ${moment().format('DD/MM/YYYY HH:mm')} - Página ${i} de ${pageCount}`, 14, doc.internal.pageSize.height - 10);
      }
      
      // Salvar o PDF
      const fileName = `metricas_${adAccountId}_${moment().format('YYYYMMDD_HHmmss')}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  // Abrir diálogo para gerar relatório compartilhável
  const openShareDialog = () => {
    setReportName(`Relatório ${adAccountName || adAccountId} - ${moment(dateRange.startDate).format('DD/MM/YYYY')} a ${moment(dateRange.endDate).format('DD/MM/YYYY')}`);
    setShareDialogOpen(true);
    setReportError(null);
    setReportData(null);
  };

  // Fechar diálogo de compartilhamento
  const closeShareDialog = () => {
    setShareDialogOpen(false);
    setReportLinkCopied(false);
  };

  // Gerar relatório com link compartilhável
  const generateShareableReport = async () => {
    if (!companyId || !adAccountId || !totalMetrics) {
      setReportError('Dados insuficientes para gerar o relatório');
      return;
    }

    try {
      setGeneratingReport(true);
      setReportError(null);
      
      const response = await reportService.generateReport(companyId, adAccountId, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        reportName: reportName
      });

      if (response.success && response.data) {
        setReportData(response.data);
      } else {
        setReportError('Falha ao gerar o relatório. Tente novamente.');
      }
    } catch (err: any) {
      console.error('Erro ao gerar relatório compartilhável:', err);
      setReportError(err.message || 'Ocorreu um erro ao gerar o relatório');
    } finally {
      setGeneratingReport(false);
    }
  };

  // Copiar link de compartilhamento para a área de transferência
  const copyReportLink = () => {
    if (reportData?.reportUrl) {
      const fullUrl = window.location.origin + reportService.getReportDownloadUrl(reportData.reportUrl);
      navigator.clipboard.writeText(fullUrl)
        .then(() => {
          setReportLinkCopied(true);
          setTimeout(() => setReportLinkCopied(false), 3000);
        })
        .catch(err => {
          console.error('Erro ao copiar para área de transferência:', err);
        });
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

  // Função auxiliar para extrair dados de compras de diferentes fontes
  const extractPurchasesData = (metricItem: any): number => {
    // 1. Verificar se existe diretamente no objeto metrics
    if (metricItem.metrics.purchases) {
      return metricItem.metrics.purchases;
    }
    
    // 2. Verificar nos additionalMetrics (campo Map no MongoDB)
    if (metricItem.additionalMetrics && metricItem.additionalMetrics.purchases) {
      return Number(metricItem.additionalMetrics.purchases) || 0;
    }
    
    // 3. Verificar nos additionalMetrics em formato de objeto
    if (metricItem.additionalMetrics && typeof metricItem.additionalMetrics === 'object') {
      // Procurar por qualquer campo que contenha 'purchase' ou 'compra' no nome
      const purchaseMetrics = Object.entries(metricItem.additionalMetrics).find(
        ([key]) => key.includes('purchase') || key.includes('compra')
      );
      if (purchaseMetrics) {
        return Number(purchaseMetrics[1]) || 0;
      }
    }
    
    // 4. Procurar por actions (do Facebook)
    if (metricItem.metrics.actions && Array.isArray(metricItem.metrics.actions)) {
      const purchaseActions = metricItem.metrics.actions.filter(
        (action: any) => 
          action.action_type === 'purchase' || 
          action.action_type === 'offsite_conversion.fb_pixel_purchase' ||
          action.action_type.includes('purchase')
      );
      if (purchaseActions.length > 0) {
        let total = 0;
        purchaseActions.forEach((action: any) => {
          total += Number(action.value) || 1;
        });
        return total;
      }
    }
    
    // 5. Para fins de debugging/implementação, temporariamente usar todas as conversões como compras
    return metricItem.metrics.conversions || 0;
  };

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
          // Extrair dados de compras de várias fontes possíveis
          purchases: extractPurchasesData(item),
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
      {/* Diu00e1logo de compartilhamento */}
      <Dialog open={shareDialogOpen} onClose={closeShareDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Compartilhar Relatu00f3rio</DialogTitle>
        <DialogContent>
          {reportError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {reportError}
            </Alert>
          )}

          {!reportData ? (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Gere um relatu00f3rio em PDF para compartilhar com o cliente. 
                O relatu00f3rio estaru00e1 disponu00edvel por 7 dias atravu00e9s do link gerado.
              </Typography>
              
              <TextField
                label="Nome do Relatu00f3rio"
                fullWidth
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                sx={{ mb: 2 }}
                disabled={generatingReport}
              />
            </>
          ) : (
            <>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Seu relatu00f3rio foi gerado com sucesso! Copie o link abaixo para compartilhar:
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, bgcolor: 'background.paper', p: 1, borderRadius: 1 }}>
                <Typography variant="body2" sx={{ flexGrow: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {window.location.origin + reportService.getReportDownloadUrl(reportData.reportUrl)}
                </Typography>
                <Tooltip title="Copiar link" arrow>
                  <IconButton onClick={copyReportLink} color="primary">
                    <FileCopyIcon />
                  </IconButton>
                </Tooltip>
              </Box>

              <Typography variant="caption" color="text.secondary">
                Este link expira em {moment(reportData.expiresAt).format('DD/MM/YYYY [às] HH:mm')}
              </Typography>
              
              {reportLinkCopied && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Link copiado para a u00e1rea de transferu00eancia!
                </Alert>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          {!reportData ? (
            <>
              <Button onClick={closeShareDialog} disabled={generatingReport}>
                Cancelar
              </Button>
              <Button 
                onClick={generateShareableReport} 
                variant="contained" 
                color="primary"
                disabled={generatingReport}
                startIcon={generatingReport ? <CircularProgress size={20} /> : <PictureAsPdfIcon />}
              >
                {generatingReport ? 'Gerando...' : 'Gerar Relatu00f3rio'}
              </Button>
            </>
          ) : (
            <Button onClick={closeShareDialog} variant="contained" color="primary">
              Fechar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Notificau00e7u00e3o de link copiado */}
      <Snackbar
        open={reportLinkCopied}
        autoHideDuration={3000}
        onClose={() => setReportLinkCopied(false)}
        message="Link copiado para a u00e1rea de transferu00eancia!"
      />

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
          <Button
            variant="outlined"
            color="info"
            onClick={openShareDialog}
            startIcon={<ShareIcon />}
            disabled={loading || !metrics.length}
            title="Compartilhar relatório com cliente"
          >
            Compartilhar
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
          
          {/* Terceira linha de cards com métricas adicionais */}
          <Grid container spacing={3} sx={{ mb: 4, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)' }}>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 3' } }}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary" gutterBottom>
                    Compras
                  </Typography>
                  <Typography variant="h5" component="div">
                    {totalMetrics.purchases?.toLocaleString() || "0"}
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
                  <Button 
                    variant={selectedMetrics.purchases ? "contained" : "outlined"}
                    color="primary"
                    size="small"
                    onClick={() => setSelectedMetrics(prev => ({...prev, purchases: !prev.purchases}))}
                  >
                    Compras
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
                    <RechartsTooltip
                      labelFormatter={(value: any) => {
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
                    {selectedMetrics.purchases && (
                      <Bar yAxisId="right" dataKey="purchases" name="Compras" fill="#8B008B" />
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
                    <RechartsTooltip
                      labelFormatter={(value: any) => {
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
