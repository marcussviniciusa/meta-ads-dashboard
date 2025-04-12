import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Alert,
  CircularProgress,
  Divider,
  TextField,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Checkbox,
  FormControlLabel,
  SelectChangeEvent,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, subDays } from 'date-fns';
import { Assignment, ArrowBack, ArrowForward, GetApp, BarChart, PieChart, ShowChart } from '@mui/icons-material';

// Interface para métricas disponíveis com rótulos amigáveis
interface MetricOption {
  value: string;
  label: string;
  description?: string;
  category: 'engagement' | 'monetary' | 'performance' | 'conversion';
}

// Interface para gráficos disponíveis com rótulos amigáveis
interface ChartOption {
  value: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const ReportMetricsSelector: React.FC<{
  onSubmit: (selectedMetrics: string[], selectedCharts: string[]) => void;
  isLoading?: boolean;
}> = ({ onSubmit, isLoading = false }) => {
  // Lista completa de métricas disponíveis
  const availableMetrics: MetricOption[] = [
    { value: 'impressions', label: 'Impressões', category: 'engagement', description: 'Número total de vezes que seus anúncios foram exibidos' },
    { value: 'clicks', label: 'Cliques', category: 'engagement', description: 'Número total de cliques em seus anúncios' },
    { value: 'spend', label: 'Investimento', category: 'monetary', description: 'Valor total investido na campanha' },
    { value: 'reach', label: 'Alcance', category: 'engagement', description: 'Número único de pessoas que viram seus anúncios' },
    { value: 'ctr', label: 'CTR', category: 'performance', description: 'Taxa de cliques por impressão (Click-Through Rate)' },
    { value: 'cpc', label: 'CPC', category: 'monetary', description: 'Custo médio por clique' },
    { value: 'cpm', label: 'CPM', category: 'monetary', description: 'Custo por mil impressões' },
    { value: 'frequency', label: 'Frequência', category: 'engagement', description: 'Média de vezes que cada pessoa viu seus anúncios' },
    { value: 'conversions', label: 'Conversões', category: 'conversion', description: 'Total de conversões atribuídas aos seus anúncios' },
    { value: 'purchases', label: 'Compras', category: 'conversion', description: 'Total de compras atribuídas aos seus anúncios' },
    { value: 'cost_per_conversion', label: 'Custo por Conversão', category: 'monetary', description: 'Valor médio gasto para cada conversão' },
    { value: 'conversion_rate', label: 'Taxa de Conversão', category: 'performance', description: 'Porcentagem de cliques que resultaram em conversões' },
  ];
  
  // Lista de gráficos disponíveis
  const availableCharts: ChartOption[] = [
    { 
      value: 'performance_over_time', 
      label: 'Desempenho ao Longo do Tempo', 
      description: 'Gráfico de linha mostrando a evolução das métricas principais durante o período.',
      icon: <ShowChart />
    },
    { 
      value: 'performance_comparison', 
      label: 'Comparação de Métricas', 
      description: 'Gráfico de barras comparando diferentes métricas selecionadas.',
      icon: <BarChart />
    },
    { 
      value: 'distribution_pie_chart', 
      label: 'Distribuição de Resultados', 
      description: 'Gráfico de pizza mostrando a proporção relativa entre as métricas principais.',
      icon: <PieChart />
    }
  ];
  
  // Estados para as seleções do usuário
  const [metrics, setMetrics] = useState<string[]>([
    'impressions', 'clicks', 'spend', 'reach', 'ctr', 'cpc'
  ]);
  
  const [charts, setCharts] = useState<string[]>([
    'performance_over_time', 'performance_comparison'
  ]);
  
  // Estado para a categoria selecionada para filtrar métricas
  const [metricCategory, setMetricCategory] = useState<string>('all');
  
  // Manipuladores de eventos para seleção de métricas e gráficos
  const handleMetricToggle = (metric: string) => {
    if (metrics.includes(metric)) {
      setMetrics(metrics.filter(m => m !== metric));
    } else {
      setMetrics([...metrics, metric]);
    }
  };
  
  const handleChartToggle = (chart: string) => {
    if (charts.includes(chart)) {
      setCharts(charts.filter(c => c !== chart));
    } else {
      setCharts([...charts, chart]);
    }
  };
  
  const handleCategoryChange = (event: SelectChangeEvent) => {
    setMetricCategory(event.target.value as string);
  };
  
  // Filtrar métricas por categoria
  const filteredMetrics = metricCategory === 'all' 
    ? availableMetrics 
    : availableMetrics.filter(metric => metric.category === metricCategory);
  
  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        <Assignment sx={{ mr: 1, verticalAlign: 'middle' }} />
        Personalizar Relatório
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Selecione as métricas e gráficos que deseja incluir no relatório PDF. As métricas selecionadas aparecerão 
        tanto nas tabelas quanto nos gráficos do relatório.
      </Alert>
      
      {/* Seleção de Métricas */}
      <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 1 }}>
        Métricas para Incluir no Relatório
      </Typography>
      
      {/* Filtro por categoria */}
      <FormControl variant="outlined" size="small" sx={{ mb: 2, minWidth: 200 }}>
        <InputLabel>Filtrar por Categoria</InputLabel>
        <Select
          value={metricCategory}
          onChange={handleCategoryChange}
          label="Filtrar por Categoria"
        >
          <MenuItem value="all">Todas as Métricas</MenuItem>
          <MenuItem value="engagement">Engajamento</MenuItem>
          <MenuItem value="monetary">Financeiro</MenuItem>
          <MenuItem value="performance">Performance</MenuItem>
          <MenuItem value="conversion">Conversão</MenuItem>
        </Select>
      </FormControl>
      
      {/* Lista de métricas selecionadas como chips */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
        {metrics.map(metricValue => {
          const metric = availableMetrics.find(m => m.value === metricValue);
          return (
            <Chip 
              key={metricValue}
              label={metric?.label || metricValue}
              onDelete={() => handleMetricToggle(metricValue)}
              color="primary"
              variant="outlined"
              size="small"
            />
          );
        })}
      </Box>
      
      {/* Grade de opções de métricas */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {filteredMetrics.map((metric) => (
          <Box 
            key={metric.value} 
            sx={{ 
              width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 8px)' },
              mb: 1
            }}
          >
            <FormControlLabel
              control={
                <Checkbox 
                  checked={metrics.includes(metric.value)} 
                  onChange={() => handleMetricToggle(metric.value)}
                  color="primary"
                />
              }
              label={
                <Box>
                  <Typography variant="body2">{metric.label}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {metric.description}
                  </Typography>
                </Box>
              }
              sx={{ 
                display: 'flex', 
                border: '1px solid #e0e0e0', 
                borderRadius: 1, 
                p: 1, 
                m: 0, 
                width: '100%',
                height: '100%',
                backgroundColor: metrics.includes(metric.value) ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
              }}
            />
          </Box>
        ))}
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      {/* Seleção de Gráficos */}
      <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 1 }}>
        Gráficos para Incluir no Relatório
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {availableCharts.map((chart) => (
          <Box 
            key={chart.value}
            sx={{ 
              width: { xs: '100%', md: 'calc(33.33% - 16px)' },
              mb: 2
            }}
          >
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                border: '1px solid #e0e0e0',
                borderColor: charts.includes(chart.value) ? 'primary.main' : '#e0e0e0',
                borderRadius: 2,
                backgroundColor: charts.includes(chart.value) ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                cursor: 'pointer',
                height: '100%',
                display: 'flex',
                flexDirection: 'column'
              }}
              onClick={() => handleChartToggle(chart.value)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box sx={{ mr: 1, color: 'primary.main' }}>
                  {chart.icon}
                </Box>
                <Typography variant="subtitle1">{chart.label}</Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                {chart.description}
              </Typography>
              
              <Box sx={{ mt: 'auto', pt: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={charts.includes(chart.value)} 
                      onChange={() => handleChartToggle(chart.value)}
                      color="primary"
                    />
                  }
                  label="Incluir"
                />
              </Box>
            </Paper>
          </Box>
        ))}
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={() => {
            setMetrics(['impressions', 'clicks', 'spend', 'reach', 'ctr', 'cpc']);
            setCharts(['performance_over_time', 'performance_comparison']);
          }}
          disabled={isLoading}
        >
          Restaurar Padrões
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          disabled={isLoading || metrics.length === 0}
          onClick={() => onSubmit(metrics, charts)}
        >
          {isLoading ? 'Processando...' : `Continuar com ${metrics.length} métricas`}
        </Button>
      </Box>
      
      {metrics.length === 0 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Selecione pelo menos uma métrica para continuar.
        </Alert>
      )}
    </Paper>
  );
};

import { reportService } from '../services/reportService';

const steps = ['Selecionar período', 'Escolher métricas e gráficos', 'Gerar e baixar relatório'];

interface DateRange {
  startDate: Date;
  endDate: Date;
}

const ReportGenerator: React.FC = () => {
  const params = useParams<{ companyId: string; adAccountId: string }>();
  const companyId = params.companyId;
  const adAccountId = params.adAccountId;
  
  // Estados
  const [activeStep, setActiveStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Dados do relatório
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
  });
  const [reportName, setReportName] = useState('');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [selectedCharts, setSelectedCharts] = useState<string[]>([]);
  const [reportTheme, setReportTheme] = useState<'default' | 'modern' | 'minimal'>('modern');
  const [generatedReport, setGeneratedReport] = useState<{
    reportId: string;
    reportName: string;
    reportUrl: string;
    expiresAt: string;
  } | null>(null);

  // Efeito para definir um nome padrão para o relatório
  useEffect(() => {
    if (!reportName) {
      setReportName(`Relatório de Métricas - ${format(dateRange.startDate, 'dd/MM/yyyy')} a ${format(dateRange.endDate, 'dd/MM/yyyy')}`);
    }
  }, [dateRange, reportName]);

  // Avançar para o próximo passo
  const handleNext = () => {
    setActiveStep((prevStep) => prevStep + 1);
  };

  // Voltar para o passo anterior
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  // Reiniciar o processo
  const handleReset = () => {
    setActiveStep(0);
    setGeneratedReport(null);
  };

  // Validar período selecionado
  const isDateRangeValid = () => {
    return dateRange.startDate && dateRange.endDate && dateRange.startDate <= dateRange.endDate;
  };

  // Processar seleção de métricas e gráficos
  const handleMetricsSelection = (metrics: string[], charts: string[]) => {
    setSelectedMetrics(metrics);
    setSelectedCharts(charts);
    handleNext();
  };

  // Gerar o relatório
  const handleGenerateReport = async () => {
    if (!companyId || !adAccountId) {
      setError('Parâmetros de empresa ou conta de anúncios inválidos');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const reportParams = {
        startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
        endDate: format(dateRange.endDate, 'yyyy-MM-dd'),
        reportName,
        selectedMetrics,
        selectedCharts,
        includeGraphics: true,
        theme: reportTheme
      };
      
      const response = await reportService.generateReport(companyId, adAccountId, reportParams);
      
      if (response.success) {
        setGeneratedReport(response.data);
        setSuccess('Relatório gerado com sucesso!');
      } else {
        setError('Erro ao gerar relatório');
      }
    } catch (err) {
      console.error('Erro ao gerar relatório:', err);
      setError('Ocorreu um erro ao gerar o relatório. Por favor, tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Baixar o relatório gerado
  const handleDownloadReport = () => {
    if (generatedReport) {
      try {
        console.log('Relatório gerado:', generatedReport);
        
        // Construir URL completa para o arquivo PDF estático no BACKEND
        // Importante: usar a porta do backend (5000) em vez da porta do frontend (5173)
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const pdfUrl = `${baseUrl}${generatedReport.reportUrl}`;
        
        console.log('Abrindo URL do PDF:', pdfUrl);
        
        // Abrir o PDF em uma nova aba
        window.open(pdfUrl, '_blank');
        
        // Feedback para o usuário
        setSuccess('PDF aberto em nova aba');
      } catch (error) {
        console.error('Erro ao abrir relatório:', error);
        setError(`Erro ao abrir relatório: ${error instanceof Error ? error.message : 'Tente novamente'}`);
      }
    }
  };

  // Renderizar conteúdo de acordo com o passo ativo
  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Defina o período do relatório
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <LocalizationProvider dateAdapter={AdapterDateFns} localeText={{ start: 'Início', end: 'Fim' }}>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                    <Box sx={{ flex: 1 }}>
                      <DatePicker
                        label="Data Inicial"
                        value={dateRange.startDate}
                        onChange={(newValue) => {
                          if (newValue) {
                            setDateRange({ ...dateRange, startDate: newValue });
                          }
                        }}
                        slotProps={{ textField: { fullWidth: true } }}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <DatePicker
                        label="Data Final"
                        value={dateRange.endDate}
                        onChange={(newValue) => {
                          if (newValue) {
                            setDateRange({ ...dateRange, endDate: newValue });
                          }
                        }}
                        slotProps={{ textField: { fullWidth: true } }}
                      />
                    </Box>
                  </Box>
                </LocalizationProvider>
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <TextField
                  label="Nome do Relatório"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  fullWidth
                  variant="outlined"
                />
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <FormControl fullWidth>
                  <InputLabel>Tema do Relatório</InputLabel>
                  <Select
                    value={reportTheme}
                    label="Tema do Relatório"
                    onChange={(e) => setReportTheme(e.target.value as 'default' | 'modern' | 'minimal')}
                  >
                    <MenuItem value="default">Padrão</MenuItem>
                    <MenuItem value="modern">Moderno</MenuItem>
                    <MenuItem value="minimal">Minimalista</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Paper>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                endIcon={<ArrowForward />}
                onClick={handleNext}
                disabled={!isDateRangeValid()}
              >
                Próximo
              </Button>
            </Box>
          </Box>
        );
        
      case 1:
        return (
          <Box sx={{ mt: 4 }}>
            <ReportMetricsSelector 
              onSubmit={handleMetricsSelection} 
              isLoading={isLoading}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={handleBack}
              >
                Voltar
              </Button>
            </Box>
          </Box>
        );
        
      case 2:
        return (
          <Box sx={{ mt: 4 }}>
            <Paper elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Gerar Relatório PDF
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="body1">
                      <strong>Nome do relatório:</strong> {reportName}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1">
                        <strong>Período:</strong> {format(dateRange.startDate, 'dd/MM/yyyy')} a {format(dateRange.endDate, 'dd/MM/yyyy')}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1">
                        <strong>Tema:</strong> {
                          reportTheme === 'default' ? 'Padrão' : 
                          reportTheme === 'modern' ? 'Moderno' : 
                          'Minimalista'
                        }
                      </Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="body1">
                      <strong>Métricas selecionadas:</strong> {selectedMetrics.length}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body1">
                      <strong>Gráficos selecionados:</strong> {selectedCharts.length}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              
              <Divider sx={{ my: 3 }} />
              
              {!generatedReport ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <Assignment />}
                    onClick={handleGenerateReport}
                    disabled={isLoading}
                    sx={{ minWidth: 200 }}
                  >
                    {isLoading ? 'Gerando...' : 'Gerar PDF'}
                  </Button>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                  <Alert severity="success" sx={{ width: '100%', mb: 2 }}>
                    Relatório gerado com sucesso!
                  </Alert>
                  
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<GetApp />}
                    onClick={handleDownloadReport}
                    sx={{ minWidth: 200 }}
                  >
                    Baixar Relatório
                  </Button>
                  
                  <Typography variant="caption" sx={{ mt: 2, color: 'text.secondary' }}>
                    Este link expira em {new Date(generatedReport.expiresAt).toLocaleString()}
                  </Typography>
                </Box>
              )}
            </Paper>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={handleBack}
                disabled={isLoading}
              >
                Voltar
              </Button>
              
              {generatedReport && (
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleReset}
                >
                  Criar Novo Relatório
                </Button>
              )}
            </Box>
          </Box>
        );
        
      default:
        return 'Passo desconhecido';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ my: 4 }}>
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom>
          Gerador de Relatórios PDF
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Crie relatórios personalizados com as métricas e visualizações que você precisa.
        </Typography>
      </Paper>
      
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {getStepContent(activeStep)}
      
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        message={success}
      />
    </Container>
  );
};

export default ReportGenerator;
