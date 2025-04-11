import { useState, useEffect } from 'react';
import { 
  Box, 
  FormControl, 
  InputLabel, 
  MenuItem, 
  Select, 
  Button, 
  Stack 
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import moment from 'moment';

type DateRangeType = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'custom';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateRangeSelectorProps {
  onChange: (dateRange: DateRange) => void;
  initialRange?: DateRange;
}

const DateRangeSelector = ({ onChange, initialRange }: DateRangeSelectorProps) => {
  const [rangeType, setRangeType] = useState<DateRangeType>('last30days');
  const [customStartDate, setCustomStartDate] = useState<moment.Moment | null>(null);
  const [customEndDate, setCustomEndDate] = useState<moment.Moment | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: moment().subtract(30, 'days').format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD'),
  });

  // Inicializar com o valor inicial se disponível
  useEffect(() => {
    if (initialRange) {
      setDateRange(initialRange);
      
      // Determinar o tipo de intervalo com base nas datas iniciais
      const start = moment(initialRange.startDate);
      const end = moment(initialRange.endDate);
      
      if (moment(start).isSame(moment(), 'day') && moment(end).isSame(moment(), 'day')) {
        setRangeType('today');
      } else if (moment(start).isSame(moment().subtract(1, 'day'), 'day') && 
                moment(end).isSame(moment().subtract(1, 'day'), 'day')) {
        setRangeType('yesterday');
      } else if (moment(start).isSame(moment().subtract(7, 'days'), 'day') && 
                moment(end).isSame(moment(), 'day')) {
        setRangeType('last7days');
      } else if (moment(start).isSame(moment().subtract(30, 'days'), 'day') && 
                moment(end).isSame(moment(), 'day')) {
        setRangeType('last30days');
      } else if (moment(start).isSame(moment().startOf('month'), 'day') && 
                moment(end).isSame(moment(), 'day')) {
        setRangeType('thisMonth');
      } else if (moment(start).isSame(moment().subtract(1, 'month').startOf('month'), 'day') && 
                moment(end).isSame(moment().subtract(1, 'month').endOf('month'), 'day')) {
        setRangeType('lastMonth');
      } else {
        setRangeType('custom');
        setCustomStartDate(start);
        setCustomEndDate(end);
      }
    }
  }, [initialRange]);

  // Atualiza o intervalo de datas com base no tipo selecionado
  const updateDateRange = (type: DateRangeType) => {
    let newRange: DateRange;
    
    switch (type) {
      case 'today':
        newRange = {
          startDate: moment().format('YYYY-MM-DD'),
          endDate: moment().format('YYYY-MM-DD'),
        };
        break;
      case 'yesterday':
        newRange = {
          startDate: moment().subtract(1, 'day').format('YYYY-MM-DD'),
          endDate: moment().subtract(1, 'day').format('YYYY-MM-DD'),
        };
        break;
      case 'last7days':
        newRange = {
          startDate: moment().subtract(7, 'days').format('YYYY-MM-DD'),
          endDate: moment().format('YYYY-MM-DD'),
        };
        break;
      case 'last30days':
        newRange = {
          startDate: moment().subtract(30, 'days').format('YYYY-MM-DD'),
          endDate: moment().format('YYYY-MM-DD'),
        };
        break;
      case 'thisMonth':
        newRange = {
          startDate: moment().startOf('month').format('YYYY-MM-DD'),
          endDate: moment().format('YYYY-MM-DD'),
        };
        break;
      case 'lastMonth':
        newRange = {
          startDate: moment().subtract(1, 'month').startOf('month').format('YYYY-MM-DD'),
          endDate: moment().subtract(1, 'month').endOf('month').format('YYYY-MM-DD'),
        };
        break;
      case 'custom':
        // Para o tipo personalizado, mantém as datas personalizadas atuais ou usa o intervalo atual
        newRange = {
          startDate: customStartDate ? customStartDate.format('YYYY-MM-DD') : dateRange.startDate,
          endDate: customEndDate ? customEndDate.format('YYYY-MM-DD') : dateRange.endDate,
        };
        break;
      default:
        newRange = dateRange;
    }
    
    setDateRange(newRange);
    onChange(newRange);
  };

  // Lidar com a mudança no tipo de intervalo
  const handleRangeTypeChange = (newType: DateRangeType) => {
    setRangeType(newType);
    updateDateRange(newType);
  };

  // Lidar com a mudança de datas personalizadas
  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      const newRange = {
        startDate: customStartDate.format('YYYY-MM-DD'),
        endDate: customEndDate.format('YYYY-MM-DD'),
      };
      setDateRange(newRange);
      onChange(newRange);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
          <InputLabel>Período</InputLabel>
          <Select
            value={rangeType}
            onChange={(e) => handleRangeTypeChange(e.target.value as DateRangeType)}
            label="Período"
          >
            <MenuItem value="today">Hoje</MenuItem>
            <MenuItem value="yesterday">Ontem</MenuItem>
            <MenuItem value="last7days">Últimos 7 dias</MenuItem>
            <MenuItem value="last30days">Últimos 30 dias</MenuItem>
            <MenuItem value="thisMonth">Este mês</MenuItem>
            <MenuItem value="lastMonth">Mês passado</MenuItem>
            <MenuItem value="custom">Personalizado</MenuItem>
          </Select>
        </FormControl>

        {rangeType === 'custom' && (
          <Stack direction="row" spacing={2} alignItems="center">
            <DatePicker
              label="Data Inicial"
              value={customStartDate}
              onChange={(date) => setCustomStartDate(date)}
              format="DD/MM/YYYY"
              slotProps={{ textField: { fullWidth: true } }}
            />
            <DatePicker
              label="Data Final"
              value={customEndDate}
              onChange={(date) => setCustomEndDate(date)}
              format="DD/MM/YYYY"
              slotProps={{ textField: { fullWidth: true } }}
            />
            <Button 
              variant="contained" 
              onClick={handleCustomDateChange}
              disabled={!customStartDate || !customEndDate}
            >
              Aplicar
            </Button>
          </Stack>
        )}

        <Box sx={{ mt: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
          Período selecionado: {moment(dateRange.startDate).format('DD/MM/YYYY')} - {moment(dateRange.endDate).format('DD/MM/YYYY')}
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default DateRangeSelector;
