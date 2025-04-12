import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import {
  ArrowBack,
  CalendarToday,
  Business
} from '@mui/icons-material';
import axios from 'axios';
import MetricsDisplay from '../components/MetricsDisplay';
import TimeSeriesChart from '../components/TimeSeriesChart';
import ComparisonChart from '../components/ComparisonChart';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Configure base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const SharedDashboardPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await axios.get(`${API_URL}/api/public/dashboard/${token}`);
        setDashboardData(response.data.data);
        document.title = `Dashboard - ${response.data.data.company}`;
      } catch (err: any) {
        console.error('Erro ao carregar dashboard:', err);
        setError(err.response?.data?.error || 'Não foi possível carregar o dashboard. O link pode ter expirado ou sido removido.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [token]);
  
  // Função para formatar datas
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };
  
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        bgcolor: '#f5f5f5',
        p: 3
      }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            maxWidth: 500,
            width: '100%' 
          }}
        >
          <Typography variant="h5" gutterBottom>Carregando dashboard...</Typography>
          <CircularProgress size={60} sx={{ my: 4 }} />
          <Typography variant="body2" color="text.secondary">
            Aguarde enquanto carregamos os dados mais recentes.
          </Typography>
        </Paper>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        bgcolor: '#f5f5f5',
        p: 3
      }}>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            maxWidth: 500,
            width: '100%' 
          }}
        >
          <Typography variant="h5" gutterBottom color="error">Link inválido ou expirado</Typography>
          <Alert severity="error" sx={{ width: '100%', my: 2 }}>
            {error}
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Entre em contato com a pessoa que compartilhou este link para solicitar um novo acesso.
          </Typography>
          <Button 
            variant="outlined" 
            startIcon={<ArrowBack />}
            onClick={() => window.close()}
          >
            Voltar
          </Button>
        </Paper>
      </Box>
    );
  }
  
  if (!dashboardData) {
    return null;
  }
  
  // Métricas para display
  const { metrics, aggregatedMetrics, company, dateRange, selectedMetrics } = dashboardData;
  
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5', pb: 8 }}>
      {/* Cabeçalho do Dashboard */}
      <Box sx={{ bgcolor: '#1976d2', color: 'white', py: 3, mb: 4 }}>
        <Container>
          <Typography variant="h4" gutterBottom>
            Dashboard Meta Ads
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Business sx={{ mr: 1 }} />
            <Typography variant="subtitle1">
              {company}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <CalendarToday sx={{ mr: 1 }} />
            <Typography variant="subtitle1">
              {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
            </Typography>
          </Box>
        </Container>
      </Box>
      
      <Container>
        {/* Métricas Agregadas */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Métricas de Desempenho
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: -1.5 }}>
            {selectedMetrics.map((metric: string) => (
              <Box key={metric} sx={{ width: { xs: '100%', sm: '50%', md: '33.33%' }, padding: 1.5 }}>
                <MetricsDisplay 
                  metric={metric} 
                  value={aggregatedMetrics[metric]} 
                />
              </Box>
            ))}
          </Box>
        </Box>
        
        {/* Gráficos */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Desempenho ao Longo do Tempo
          </Typography>
          <Paper sx={{ p: 3, height: 400 }}>
            <TimeSeriesChart 
              data={metrics} 
              metrics={selectedMetrics.slice(0, 3)} 
            />
          </Paper>
        </Box>
        
        {selectedMetrics.length >= 2 && (
          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" gutterBottom>
              Comparação de Métricas
            </Typography>
            <Paper sx={{ p: 3, height: 400 }}>
              <ComparisonChart 
                data={metrics} 
                metrics={selectedMetrics.slice(0, 4)} 
              />
            </Paper>
          </Box>
        )}
        
        {/* Rodapé */}
        <Box sx={{ mt: 8, pt: 3, borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Dashboard compartilhado por {company}
          </Typography>
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
            Dados gerados com base nas campanhas Meta Ads
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default SharedDashboardPage;
