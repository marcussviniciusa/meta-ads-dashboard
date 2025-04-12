import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper, 
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Snackbar,
  SelectChangeEvent
} from '@mui/material';
import {
  Add as AddIcon,
  ContentCopy as CopyIcon,
  Visibility as VisibilityIcon,
  Schedule as ScheduleIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Layout from '../components/Layout';
import api from '../services/api';
import authService from '../services/authService';

// Interface para links compartilháveis
interface SharedLink {
  _id: string;
  token: string;
  name: string;
  description: string;
  companyId: {
    _id: string;
    name: string;
  };
  adAccountId: string;
  dateRange: {
    type: 'last7days' | 'last30days' | 'last90days' | 'custom';
    startDate?: string;
    endDate?: string;
  };
  selectedMetrics: string[];
  isActive: boolean;
  expiresAt: string;
  createdAt: string;
  createdBy: {
    _id: string;
    name: string;
  };
}

// Interface para empresas
interface Company {
  _id: string;
  name: string;
  metaAdAccounts: Array<{
    accountId: string;
    name: string;
    status: string;
  }>;
}

const SharedLinksManagement: React.FC = () => {
  const [sharedLinks, setSharedLinks] = useState<SharedLink[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    type: 'success' as 'success' | 'error'
  });

  // Estado do formulário
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    companyId: '',
    adAccountId: '',
    dateRangeType: 'last30days' as 'last7days' | 'last30days' | 'last90days' | 'custom',
    startDate: '',
    endDate: '',
    expiryDays: '90',
    selectedMetrics: ['impressions', 'clicks', 'spend', 'ctr', 'cpc']
  });

  // Buscar links compartilháveis
  const fetchSharedLinks = async () => {
    try {
      setLoading(true);
      const response = await api.get('/shared-links');
      setSharedLinks(response.data.data);
      setError(null);
    } catch (err: any) {
      console.error('Erro ao buscar links compartilháveis:', err);
      setError(err.response?.data?.error || 'Não foi possível carregar os links compartilháveis');
    } finally {
      setLoading(false);
    }
  };

  // Buscar empresas
  const fetchCompanies = async () => {
    try {
      const user = authService.getUser();
      const isSuperAdmin = user?.role === 'superadmin';
      
      const response = await api.get('/companies');
      
      // Se for superadmin, mostra todas as empresas
      // Se for usuário comum, mostra apenas a empresa associada ao usuário
      if (isSuperAdmin) {
        setCompanies(response.data.data);
      } else if (user?.company) {
        // Filtrar apenas a empresa do usuário
        const userCompany = response.data.data.filter((company: any) => 
          company._id === user.company
        );
        setCompanies(userCompany);
      } else {
        setCompanies([]);
      }
    } catch (err: any) {
      console.error('Erro ao buscar empresas:', err);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    fetchSharedLinks();
    fetchCompanies();
  }, []);

  // Formatar data
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  // Verificar se link está expirado
  const isLinkExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  // Handler para campos de texto
  const handleTextInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handler para selects
  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Abrir dialog para criar novo link
  const handleOpenCreateDialog = () => {
    setFormData({
      name: '',
      description: '',
      companyId: '',
      adAccountId: '',
      dateRangeType: 'last30days',
      startDate: '',
      endDate: '',
      expiryDays: '90',
      selectedMetrics: ['impressions', 'clicks', 'spend', 'ctr', 'cpc']
    });
    setOpenDialog(true);
  };

  // Copiar link para área de transferência
  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/shared-dashboard/${token}`;
    navigator.clipboard.writeText(url)
      .then(() => {
        setNotification({
          open: true,
          message: 'Link copiado para a área de transferência!',
          type: 'success'
        });
      })
      .catch(() => {
        setNotification({
          open: true,
          message: 'Não foi possível copiar o link',
          type: 'error'
        });
      });
  };

  // Abrir dashboard em nova aba
  const handleOpenDashboard = (token: string) => {
    window.open(`/shared-dashboard/${token}`, '_blank');
  };

  // Excluir link compartilhável
  const handleDeleteLink = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este link compartilhável?')) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/shared-links/${id}`);
      
      setNotification({
        open: true,
        message: 'Link excluído com sucesso!',
        type: 'success'
      });
      
      fetchSharedLinks();
    } catch (err: any) {
      console.error('Erro ao excluir link:', err);
      setNotification({
        open: true,
        message: err.response?.data?.error || 'Erro ao excluir link',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Criar link compartilhável
  const handleSaveLink = async () => {
    if (!formData.name) {
      setNotification({
        open: true,
        message: 'Por favor, preencha o nome do link',
        type: 'error'
      });
      return;
    }

    try {
      setLoading(true);
      
      // Dados para criar link compartilhável
      const linkData = {
        name: formData.name,
        description: formData.description,
        companyId: formData.companyId || companies[0]?._id,
        adAccountId: formData.adAccountId || companies[0]?.metaAdAccounts[0]?.accountId,
        dateRange: {
          type: formData.dateRangeType
        },
        selectedMetrics: formData.selectedMetrics,
        expiryDays: parseInt(formData.expiryDays)
      };
      
      await api.post('/shared-links', linkData);
      
      setNotification({
        open: true,
        message: 'Link criado com sucesso!',
        type: 'success'
      });
      
      setOpenDialog(false);
      fetchSharedLinks();
    } catch (err: any) {
      console.error('Erro ao criar link:', err);
      setNotification({
        open: true,
        message: err.response?.data?.error || 'Erro ao criar link',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Gerenciamento de Links Compartilháveis">
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1">
            Gerenciamento de Links Compartilháveis
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
          >
            Novo Link
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 4 }}>
            {error}
          </Alert>
        )}
        
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : sharedLinks.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                Nenhum link compartilhável encontrado. Crie um novo link para começar.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Empresa / Conta</TableCell>
                    <TableCell>Expiração</TableCell>
                    <TableCell>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sharedLinks.map((link) => {
                    const expired = isLinkExpired(link.expiresAt);
                    
                    return (
                      <TableRow key={link._id} hover>
                        <TableCell>
                          <Typography variant="body1">{link.name}</Typography>
                          {link.description && (
                            <Typography variant="caption" color="text.secondary">
                              {link.description}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{link.companyId.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            ID: {link.adAccountId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <ScheduleIcon 
                              fontSize="small" 
                              sx={{ 
                                mr: 1, 
                                color: expired ? 'error.main' : 'success.main' 
                              }} 
                            />
                            {formatDate(link.expiresAt)}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Tooltip title="Visualizar Dashboard">
                            <IconButton 
                              onClick={() => handleOpenDashboard(link.token)}
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Copiar Link">
                            <IconButton 
                              onClick={() => handleCopyLink(link.token)}
                            >
                              <CopyIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir Link">
                            <IconButton 
                              onClick={() => handleDeleteLink(link._id)}
                              color="error"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      </Container>

      {/* Dialog para criar novo link compartilhável */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Novo Link Compartilhável
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ mb: 2, width: { xs: '100%', sm: '48%' } }}>
              <TextField
                name="name"
                label="Nome do Link"
                fullWidth
                required
                value={formData.name}
                onChange={handleTextInputChange}
              />
            </Box>
            <Box sx={{ mb: 2, width: { xs: '100%', sm: '48%' } }}>
              <TextField
                name="description"
                label="Descrição (opcional)"
                fullWidth
                value={formData.description}
                onChange={handleTextInputChange}
              />
            </Box>
            {companies.length > 0 && (
              <Box sx={{ mb: 2, width: { xs: '100%', sm: '48%' } }}>
                <FormControl fullWidth required>
                  <InputLabel>Empresa</InputLabel>
                  <Select
                    name="companyId"
                    value={formData.companyId || ''}
                    onChange={handleSelectChange}
                    label="Empresa"
                  >
                    {companies.map((company) => (
                      <MenuItem key={company._id} value={company._id}>
                        {company.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
            <Box sx={{ mb: 2, width: { xs: '100%', sm: '48%' } }}>
              <FormControl fullWidth required>
                <InputLabel>Período</InputLabel>
                <Select
                  name="dateRangeType"
                  value={formData.dateRangeType}
                  onChange={handleSelectChange}
                  label="Período"
                >
                  <MenuItem value="last7days">Últimos 7 dias</MenuItem>
                  <MenuItem value="last30days">Últimos 30 dias</MenuItem>
                  <MenuItem value="last90days">Últimos 90 dias</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ mb: 2, width: { xs: '100%', sm: '48%' } }}>
              <FormControl fullWidth required>
                <InputLabel>Expirar em</InputLabel>
                <Select
                  name="expiryDays"
                  value={formData.expiryDays}
                  onChange={handleSelectChange}
                  label="Expirar em"
                >
                  <MenuItem value="7">7 dias</MenuItem>
                  <MenuItem value="30">30 dias</MenuItem>
                  <MenuItem value="90">90 dias</MenuItem>
                  <MenuItem value="180">180 dias</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleSaveLink}
          >
            Criar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificações */}
      <Snackbar
        open={notification.open}
        autoHideDuration={5000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.type}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Layout>
  );
};

export default SharedLinksManagement;
