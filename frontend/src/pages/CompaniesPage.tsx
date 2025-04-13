import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  TablePagination,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import authService from '../services/authService';
import api from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

// Interfaces
interface Company {
  _id: string;
  name: string;
  website?: string;
  industry?: string;
  contact?: string;
  contactEmail: string;
  contactPhone?: string;
  metaAdAccounts: AdAccount[];
  createdAt: string;
}

interface AdAccount {
  accountId: string;
  name: string;
  status: string;
}

interface CompanyFormValues {
  name: string;
  website: string;
  industry: string;
  contact: string;
  contactEmail: string;
  contactPhone: string;
}

interface AdAccountFormValues {
  companyId: string;
  metaAccountId: string;
  metaAccessToken: string;
}

// Esquema de validação
const CompanySchema = Yup.object().shape({
  name: Yup.string().required('Nome é obrigatório'),
  website: Yup.string().url('URL inválida'),
  industry: Yup.string(),
  contact: Yup.string(),
  contactEmail: Yup.string().email('E-mail inválido').required('E-mail de contato é obrigatório'),
  contactPhone: Yup.string()
});

const AdAccountSchema = Yup.object().shape({
  metaAccountId: Yup.string().required('ID da conta de anúncios é obrigatório'),
  metaAccessToken: Yup.string().required('Token de acesso é obrigatório')
});

const CompaniesPage = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [openAdAccountDialog, setOpenAdAccountDialog] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);
  const [adAccountToDelete, setAdAccountToDelete] = useState<{companyId: string, accountId: string} | null>(null);
  const [deleteAdAccountConfirmOpen, setDeleteAdAccountConfirmOpen] = useState(false);
  const navigate = useNavigate();
  const isSuperAdmin = authService.isSuperAdmin();
  const { showSuccess, showError } = useNotification();

  // Redirecionar se não for superadmin
  useEffect(() => {
    if (!isSuperAdmin) {
      navigate('/dashboard');
    }
  }, [isSuperAdmin, navigate]);

  // Usar um ref para controlar carregamento inicial
  const isFirstRender = React.useRef(true);

  // Carregar empresas
  useEffect(() => {
    const fetchCompanies = async () => {
      // Só executar na primeira renderização
      if (!isFirstRender.current) return;
      
      isFirstRender.current = false;
      setLoading(true);
      setError(null);
      
      try {
        console.log("Chamando API de empresas...");
        const response = await api.get('/api/companies');
        setCompanies(response.data.data);
      } catch (err) {
        console.error('Erro ao carregar empresas:', err);
        setError('Ocorreu um erro ao carregar as empresas');
        showError('Ocorreu um erro ao carregar as empresas');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCompanies();
  }, []); // Sem dependências para garantir que execute apenas uma vez

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenDialog = (company?: Company) => {
    if (company) {
      setEditingCompany(company);
    } else {
      setEditingCompany(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingCompany(null);
  };

  const handleOpenAdAccountDialog = (companyId: string) => {
    setSelectedCompany(companyId);
    setOpenAdAccountDialog(true);
  };

  const handleCloseAdAccountDialog = () => {
    setOpenAdAccountDialog(false);
    setSelectedCompany(null);
  };

  const handleSubmit = async (values: CompanyFormValues, { resetForm, setSubmitting }: FormikHelpers<CompanyFormValues>) => {
    try {
      if (editingCompany) {
        // Atualizar empresa existente
        await api.put(`/api/companies/${editingCompany._id}`, values);
        showSuccess(`Empresa ${values.name} atualizada com sucesso!`);
      } else {
        // Criar nova empresa
        await api.post('/api/companies', values);
        showSuccess(`Empresa ${values.name} criada com sucesso!`);
      }
      
      // Recarregar empresas
      const response = await api.get('/api/companies');
      setCompanies(response.data.data);
      
      handleCloseDialog();
      resetForm();
    } catch (err) {
      console.error('Erro ao salvar empresa:', err);
      setError('Ocorreu um erro ao salvar a empresa');
      showError('Ocorreu um erro ao salvar a empresa');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitAdAccount = async (values: AdAccountFormValues, { resetForm, setSubmitting }: FormikHelpers<AdAccountFormValues>) => {
    try {
      if (selectedCompany) {
        // Adicionar conta de anúncios à empresa
        await api.post(`/api/companies/${selectedCompany}/adaccounts`, {
          accountId: values.metaAccountId,
          accessToken: values.metaAccessToken
        });
        
        // Recarregar empresas
        const response = await api.get('/api/companies');
        setCompanies(response.data.data);
        
        handleCloseAdAccountDialog();
        resetForm();
      }
    } catch (err) {
      console.error('Erro ao adicionar conta de anúncios:', err);
      setError('Ocorreu um erro ao adicionar a conta de anúncios');
      showError('Ocorreu um erro ao adicionar a conta de anúncios');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (companyId: string) => {
    setCompanyToDelete(companyId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (companyToDelete) {
      try {
        await api.delete(`/api/companies/${companyToDelete}`);
        
        // Recarregar empresas
        const response = await api.get('/api/companies');
        setCompanies(response.data.data);
        
        setDeleteConfirmOpen(false);
        setCompanyToDelete(null);
        showSuccess('Empresa excluída com sucesso!');
      } catch (err) {
        console.error('Erro ao excluir empresa:', err);
        setError('Ocorreu um erro ao excluir a empresa');
        showError('Ocorreu um erro ao excluir a empresa');
      }
    }
  };

  const handleDeleteAdAccountClick = (companyId: string, accountId: string) => {
    setAdAccountToDelete({ companyId, accountId });
    setDeleteAdAccountConfirmOpen(true);
  };

  const handleConfirmDeleteAdAccount = async () => {
    if (adAccountToDelete) {
      try {
        await api.delete(`/api/companies/${adAccountToDelete.companyId}/adaccounts/${adAccountToDelete.accountId}`);
        
        // Recarregar empresas
        const response = await api.get('/api/companies');
        setCompanies(response.data.data);
        
        setDeleteAdAccountConfirmOpen(false);
        setAdAccountToDelete(null);
        showSuccess('Conta de anúncios desconectada com sucesso!');
      } catch (err) {
        console.error('Erro ao excluir conta de anúncios:', err);
        setError('Ocorreu um erro ao excluir a conta de anúncios');
        showError('Ocorreu um erro ao excluir a conta de anúncios');
      }
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/companies');
      setCompanies(response.data.data);
      showSuccess('Dados atualizados com sucesso!');
    } catch (err) {
      console.error('Erro ao recarregar empresas:', err);
      setError('Ocorreu um erro ao recarregar as empresas');
      showError('Ocorreu um erro ao recarregar as empresas');
    } finally {
      setLoading(false);
    }
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Layout title="Gerenciamento de Empresas">
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">Empresas</Typography>
          <Box>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />} 
              onClick={handleRefresh}
              sx={{ mr: 2 }}
              disabled={loading}
            >
              Atualizar
            </Button>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />} 
              onClick={() => handleOpenDialog()}
            >
              Nova Empresa
            </Button>
          </Box>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nome</TableCell>
                    <TableCell>Website</TableCell>
                    <TableCell>Indústria</TableCell>
                    <TableCell>Contato</TableCell>
                    <TableCell>Contas de Anúncios</TableCell>
                    <TableCell>Criado em</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {companies
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((company) => (
                      <TableRow key={company._id}>
                        <TableCell>{company.name}</TableCell>
                        <TableCell>
                          {company.website ? (
                            <a href={company.website} target="_blank" rel="noopener noreferrer">
                              {company.website}
                            </a>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{company.industry || '-'}</TableCell>
                        <TableCell>{company.contact || '-'}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center">
                            <Chip 
                              label={company.metaAdAccounts.length} 
                              color={company.metaAdAccounts.length > 0 ? 'primary' : 'default'} 
                              size="small" 
                            />
                            <Button
                              size="small"
                              startIcon={<LinkIcon />}
                              onClick={() => handleOpenAdAccountDialog(company._id)}
                              sx={{ ml: 1 }}
                            >
                              Adicionar
                            </Button>
                          </Box>
                        </TableCell>
                        <TableCell>{formatDate(company.createdAt)}</TableCell>
                        <TableCell align="right">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => handleOpenDialog(company)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleDeleteClick(company._id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={companies.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Linhas por página:"
              labelDisplayedRows={({ from, to, count }) => 
                `${from}–${to} de ${count !== -1 ? count : `mais de ${to}`}`
              }
            />
          </Paper>
        )}
        
        {/* Detalhes das empresas com contas de anúncios */}
        <Box mt={4}>
          <Typography variant="h6" gutterBottom>
            Detalhes das Contas de Anúncios
          </Typography>
          
          {companies.length === 0 ? (
            <Alert severity="info">Nenhuma empresa cadastrada</Alert>
          ) : (
            companies.map((company) => (
              <Accordion key={company._id} sx={{ mb: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>{company.name}</Typography>
                  <Chip 
                    label={`${company.metaAdAccounts.length} contas`} 
                    size="small" 
                    sx={{ ml: 2 }}
                    color={company.metaAdAccounts.length > 0 ? 'primary' : 'default'}
                  />
                </AccordionSummary>
                <AccordionDetails>
                  {company.metaAdAccounts.length === 0 ? (
                    <Alert severity="info">
                      Nenhuma conta de anúncios conectada. 
                      <Button 
                        size="small" 
                        onClick={() => handleOpenAdAccountDialog(company._id)}
                        sx={{ ml: 2 }}
                      >
                        Adicionar Conta
                      </Button>
                    </Alert>
                  ) : (
                    <List disablePadding>
                      {company.metaAdAccounts.map((account) => (
                        <React.Fragment key={account.accountId}>
                          <ListItem>
                            <ListItemText
                              primary={account.name || account.accountId}
                              secondary={`ID: ${account.accountId} | Status: ${account.status === 'active' ? 'Ativo' : 'Inativo'}`}
                            />
                            <ListItemSecondaryAction>
                              <IconButton 
                                edge="end" 
                                color="error"
                                onClick={() => handleDeleteAdAccountClick(company._id, account.accountId)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </ListItem>
                          <Divider component="li" />
                        </React.Fragment>
                      ))}
                    </List>
                  )}
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </Box>
      </Box>
      
      {/* Dialog para criar/editar empresa */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingCompany ? 'Editar Empresa' : 'Nova Empresa'}
        </DialogTitle>
        <Formik
          initialValues={{
            name: editingCompany?.name || '',
            website: editingCompany?.website || '',
            industry: editingCompany?.industry || '',
            contact: editingCompany?.contact || '',
            contactEmail: editingCompany?.contactEmail || '',
            contactPhone: editingCompany?.contactPhone || ''
          }}
          validationSchema={CompanySchema}
          onSubmit={handleSubmit}
        >
          {({ errors, touched, isSubmitting }) => (
            <Form>
              <DialogContent>
                <Box mb={2}>
                  <Field
                    as={TextField}
                    fullWidth
                    id="name"
                    name="name"
                    label="Nome da Empresa"
                    variant="outlined"
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                    margin="normal"
                  />
                </Box>
                
                <Box mb={2}>
                  <Field
                    as={TextField}
                    fullWidth
                    id="website"
                    name="website"
                    label="Website"
                    variant="outlined"
                    error={touched.website && Boolean(errors.website)}
                    helperText={touched.website && errors.website}
                    margin="normal"
                  />
                </Box>
                
                <Box mb={2}>
                  <Field
                    as={TextField}
                    fullWidth
                    id="industry"
                    name="industry"
                    label="Setor/Industria"
                    variant="outlined"
                    error={touched.industry && Boolean(errors.industry)}
                    helperText={touched.industry && errors.industry}
                    margin="normal"
                  />
                </Box>
                
                <Box mb={2}>
                  <Field
                    as={TextField}
                    fullWidth
                    id="contactEmail"
                    name="contactEmail"
                    label="E-mail de Contato *"
                    variant="outlined"
                    error={touched.contactEmail && Boolean(errors.contactEmail)}
                    helperText={touched.contactEmail && errors.contactEmail}
                    margin="normal"
                    required
                  />
                </Box>
                
                <Box mb={2}>
                  <Field
                    as={TextField}
                    fullWidth
                    id="contactPhone"
                    name="contactPhone"
                    label="Telefone de Contato"
                    variant="outlined"
                    error={touched.contactPhone && Boolean(errors.contactPhone)}
                    helperText={touched.contactPhone && errors.contactPhone}
                    margin="normal"
                  />
                </Box>
                
                <Box mb={2}>
                  <Field
                    as={TextField}
                    fullWidth
                    id="contact"
                    name="contact"
                    label="Nome do Contato"
                    variant="outlined"
                    error={touched.contact && Boolean(errors.contact)}
                    helperText={touched.contact && errors.contact}
                    margin="normal"
                  />
                </Box>
              </DialogContent>
              
              <DialogActions>
                <Button onClick={handleCloseDialog}>Cancelar</Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <CircularProgress size={24} /> : 'Salvar'}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
      
      {/* Dialog para adicionar conta de anúncios */}
      <Dialog 
        open={openAdAccountDialog} 
        onClose={handleCloseAdAccountDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Adicionar Conta de Anúncios Meta</DialogTitle>
        <Formik
          initialValues={{
            companyId: selectedCompany || '',
            metaAccountId: '',
            metaAccessToken: ''
          }}
          validationSchema={AdAccountSchema}
          onSubmit={handleSubmitAdAccount}
        >
          {({ errors, touched, isSubmitting }) => (
            <Form>
              <DialogContent>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Para conectar uma conta de anúncios do Meta, você precisa do ID da conta e um token de acesso válido.
                </Alert>
                
                <Box mb={2}>
                  <Field
                    as={TextField}
                    fullWidth
                    id="metaAccountId"
                    name="metaAccountId"
                    label="ID da Conta de Anúncios"
                    variant="outlined"
                    error={touched.metaAccountId && Boolean(errors.metaAccountId)}
                    helperText={touched.metaAccountId && errors.metaAccountId}
                    margin="normal"
                  />
                </Box>
                
                <Box mb={2}>
                  <Field
                    as={TextField}
                    fullWidth
                    id="metaAccessToken"
                    name="metaAccessToken"
                    label="Token de Acesso"
                    variant="outlined"
                    error={touched.metaAccessToken && Boolean(errors.metaAccessToken)}
                    helperText={touched.metaAccessToken && errors.metaAccessToken}
                    margin="normal"
                  />
                </Box>
              </DialogContent>
              
              <DialogActions>
                <Button onClick={handleCloseAdAccountDialog}>Cancelar</Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <CircularProgress size={24} /> : 'Conectar Conta'}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>
      
      {/* Dialog para confirmar exclusão de empresa */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirmar Exclusão de Empresa</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir esta empresa? Esta ação removerá todos os dados associados, incluindo contas de anúncios conectadas e métricas. Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Dialog para confirmar exclusão de conta de anúncios */}
      <Dialog
        open={deleteAdAccountConfirmOpen}
        onClose={() => setDeleteAdAccountConfirmOpen(false)}
      >
        <DialogTitle>Confirmar Desconexão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja desconectar esta conta de anúncios? Isso removerá o acesso desta conta e todas as métricas associadas. Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAdAccountConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmDeleteAdAccount} color="error" variant="contained">
            Desconectar
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default CompaniesPage;
