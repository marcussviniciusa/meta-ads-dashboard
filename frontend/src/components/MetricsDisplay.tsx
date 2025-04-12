import React from 'react';
import { Paper, Box, Typography } from '@mui/material';
import { 
  Visibility, 
  TouchApp, 
  AttachMoney, 
  PeopleAlt, 
  BarChart, 
  MonetizationOn,
  Campaign,
  Repeat,
  ShoppingCart,
  SyncAlt
} from '@mui/icons-material';

interface MetricsDisplayProps {
  metric: string;
  value: number;
}

// Mapeia métricas para seus rótulos, ícones e formatadores
const metricConfig: Record<string, { 
  label: string; 
  icon: React.ReactNode; 
  formatter: (value: number) => string;
  color: string;
}> = {
  impressions: { 
    label: 'Impressões', 
    icon: <Visibility />, 
    formatter: (value) => new Intl.NumberFormat('pt-BR').format(value),
    color: '#2196f3'
  },
  clicks: { 
    label: 'Cliques', 
    icon: <TouchApp />, 
    formatter: (value) => new Intl.NumberFormat('pt-BR').format(value),
    color: '#ff9800'
  },
  spend: { 
    label: 'Investimento', 
    icon: <AttachMoney />, 
    formatter: (value) => `R$ ${new Intl.NumberFormat('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(value)}`,
    color: '#4caf50'
  },
  reach: { 
    label: 'Alcance', 
    icon: <PeopleAlt />, 
    formatter: (value) => new Intl.NumberFormat('pt-BR').format(value),
    color: '#9c27b0'
  },
  ctr: { 
    label: 'CTR', 
    icon: <BarChart />, 
    formatter: (value) => `${new Intl.NumberFormat('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(value)}%`,
    color: '#f44336'
  },
  cpc: { 
    label: 'CPC', 
    icon: <MonetizationOn />, 
    formatter: (value) => `R$ ${new Intl.NumberFormat('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(value)}`,
    color: '#673ab7'
  },
  cpm: { 
    label: 'CPM', 
    icon: <Campaign />, 
    formatter: (value) => `R$ ${new Intl.NumberFormat('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(value)}`,
    color: '#00bcd4'
  },
  frequency: { 
    label: 'Frequência', 
    icon: <Repeat />, 
    formatter: (value) => new Intl.NumberFormat('pt-BR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(value),
    color: '#795548'
  },
  conversions: { 
    label: 'Conversões', 
    icon: <SyncAlt />, 
    formatter: (value) => new Intl.NumberFormat('pt-BR').format(value),
    color: '#607d8b'
  },
  purchases: { 
    label: 'Compras', 
    icon: <ShoppingCart />, 
    formatter: (value) => new Intl.NumberFormat('pt-BR').format(value),
    color: '#e91e63'
  }
};

const MetricsDisplay: React.FC<MetricsDisplayProps> = ({ metric, value }) => {
  const config = metricConfig[metric] || {
    label: metric,
    icon: <BarChart />,
    formatter: (val) => String(val),
    color: '#757575'
  };
  
  return (
    <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        height: '100%'
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 2,
          color: config.color
        }}>
          {config.icon}
          <Typography 
            variant="subtitle1" 
            sx={{ ml: 1, fontWeight: 'medium' }}
          >
            {config.label}
          </Typography>
        </Box>
        
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 'bold',
            color: config.color,
            mt: 'auto'
          }}
        >
          {config.formatter(value)}
        </Typography>
      </Box>
    </Paper>
  );
};

export default MetricsDisplay;
