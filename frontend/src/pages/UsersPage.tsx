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
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import Layout from '../components/Layout';
import authService from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { useNotification } from '../contexts/NotificationContext';

// Interfaces
interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  company?: {
    _id: string;
    name: string;
  };
  createdAt: string;
}

interface Company {
  _id: string;
  name: string;
}

interface UserFormValues {
  name: string;
  email: string;
  password: string;
  role: string;
  company: string;
}

// Esquema de validação
const UserSchema = Yup.object().shape({
  name: Yup.string().required('Nome é obrigatório'),
  email: Yup.string().email('Email inválido').required('Email é obrigatório'),
  password: Yup.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: Yup.string().required('Função é obrigatória'),
  company: Yup.string().when('role', {
    is: 'user',
    then: schema => schema.required('Empresa é obrigatória para usuários comuns')
  })
});

const UsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
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

  // Carregar usuários e empresas
  useEffect(() => {
    const fetchData = async () => {
      // Só executar na primeira renderização
      if (!isFirstRender.current) return;
      
      isFirstRender.current = false;
      setLoading(true);
      setError(null);
      
      try {
        console.log("Chamando APIs de usuários e empresas...");
        // Carregar usuários
        const usersResponse = await authService.getUsers();
        setUsers(usersResponse.data);
        
        // Carregar empresas
        const companiesResponse = await authService.getCompanies();
        setCompanies(companiesResponse.data);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Ocorreu um erro ao carregar os usuários e empresas');
        showError('Ocorreu um erro ao carregar os usuários e empresas');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []); // Sem dependências para garantir que execute apenas uma vez

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
    } else {
      setEditingUser(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
  };

  const handleSubmit = async (values: UserFormValues, { resetForm, setSubmitting }: FormikHelpers<UserFormValues>) => {
    try {
      if (editingUser) {
        // Atualizar usuário existente
        await authService.updateUser(editingUser._id, values);
        showSuccess(`Usuário ${values.name} atualizado com sucesso!`);
      } else {
        // Criar novo usuário
        await authService.createUser(values);
        showSuccess(`Usuário ${values.name} criado com sucesso!`);
      }
      
      // Recarregar usuários
      const usersResponse = await authService.getUsers();
      setUsers(usersResponse.data);
      
      handleCloseDialog();
      resetForm();
    } catch (err) {
      console.error('Erro ao salvar usuário:', err);
      setError('Ocorreu um erro ao salvar o usuário');
      showError('Ocorreu um erro ao salvar o usuário');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (userId: string) => {
    setUserToDelete(userId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (userToDelete) {
      try {
        await authService.deleteUser(userToDelete);
        
        // Recarregar usuários
        const usersResponse = await authService.getUsers();
        setUsers(usersResponse.data);
        
        setDeleteConfirmOpen(false);
        setUserToDelete(null);
        showSuccess('Usuário excluído com sucesso!');
      } catch (err) {
        console.error('Erro ao excluir usuário:', err);
        setError('Ocorreu um erro ao excluir o usuário');
        showError('Ocorreu um erro ao excluir o usuário');
      }
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const usersResponse = await authService.getUsers();
      setUsers(usersResponse.data);
      showSuccess('Dados atualizados com sucesso!');
    } catch (err) {
      console.error('Erro ao recarregar usuários:', err);
      setError('Ocorreu um erro ao recarregar os usuários');
      showError('Ocorreu um erro ao recarregar os usuários');
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
    <Layout title="Gerenciamento de Usuários">
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5">Usuários</Typography>
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
              Novo Usuário
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
                    <TableCell>Email</TableCell>
                    <TableCell>Função</TableCell>
                    <TableCell>Empresa</TableCell>
                    <TableCell>Criado em</TableCell>
                    <TableCell align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((user) => (
                      <TableRow key={user._id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Chip 
                            label={user.role === 'admin' ? 'Administrador' : 'Usuário'} 
                            color={user.role === 'admin' ? 'primary' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{user.company?.name || '-'}</TableCell>
                        <TableCell>{formatDate(user.createdAt)}</TableCell>
                        <TableCell align="right">
                          <IconButton 
                            size="small" 
                            color="primary" 
                            onClick={() => handleOpenDialog(user)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            size="small" 
                            color="error" 
                            onClick={() => handleDeleteClick(user._id)}
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
              count={users.length}
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
      </Box>
      
      {/* Dialog para criar/editar usuário */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
        </DialogTitle>
        <Formik
          initialValues={{
            name: editingUser?.name || '',
            email: editingUser?.email || '',
            password: '',
            role: editingUser?.role || 'user',
            company: editingUser?.company?._id || ''
          }}
          validationSchema={UserSchema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, handleChange, isSubmitting }) => (
            <Form>
              <DialogContent>
                <Box mb={2}>
                  <Field
                    as={TextField}
                    fullWidth
                    id="name"
                    name="name"
                    label="Nome"
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
                    id="email"
                    name="email"
                    label="Email"
                    variant="outlined"
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                    margin="normal"
                  />
                </Box>
                
                <Box mb={2}>
                  <Field
                    as={TextField}
                    fullWidth
                    id="password"
                    name="password"
                    label={editingUser ? "Nova senha (deixe em branco para manter a atual)" : "Senha"}
                    type="password"
                    variant="outlined"
                    error={touched.password && Boolean(errors.password)}
                    helperText={touched.password && errors.password}
                    margin="normal"
                  />
                </Box>
                
                <Box mb={2}>
                  <FormControl fullWidth margin="normal">
                    <InputLabel id="role-label">Função</InputLabel>
                    <Field
                      as={Select}
                      labelId="role-label"
                      id="role"
                      name="role"
                      label="Função"
                      onChange={handleChange}
                      value={values.role}
                    >
                      <MenuItem value="user">Usuário</MenuItem>
                      <MenuItem value="admin">Administrador</MenuItem>
                    </Field>
                  </FormControl>
                </Box>
                
                {values.role === 'user' && (
                  <Box mb={2}>
                    <FormControl 
                      fullWidth 
                      margin="normal"
                      error={touched.company && Boolean(errors.company)}
                    >
                      <InputLabel id="company-label">Empresa</InputLabel>
                      <Field
                        as={Select}
                        labelId="company-label"
                        id="company"
                        name="company"
                        label="Empresa"
                        onChange={handleChange}
                        value={values.company}
                      >
                        <MenuItem value="">
                          <em>Selecione uma empresa</em>
                        </MenuItem>
                        {companies.map((company) => (
                          <MenuItem key={company._id} value={company._id}>
                            {company.name}
                          </MenuItem>
                        ))}
                      </Field>
                    </FormControl>
                  </Box>
                )}
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
      
      {/* Dialog para confirmar exclusão */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirmDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default UsersPage;
