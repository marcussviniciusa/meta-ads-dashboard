import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Card, 
  CardContent, 
  Alert,
  CircularProgress
} from '@mui/material';
import { Facebook as FacebookIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import authService from '../services/authService';
import { useNotification } from '../contexts/NotificationContext';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();

  // Esquema de validação do formulário
  const validationSchema = Yup.object({
    email: Yup.string()
      .email('Email inválido')
      .required('Email é obrigatório'),
    password: Yup.string()
      .required('Senha é obrigatória')
      .min(6, 'A senha deve ter pelo menos 6 caracteres'),
  });

  // Configuração do formik
  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      setLoading(true);
      setError(null);
      
      try {
        await authService.login(values);
        showSuccess('Login realizado com sucesso!');
        navigate('/dashboard');
      } catch (err: any) {
        const errorMessage = err.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.';
        setError(errorMessage);
        showError(errorMessage);
      } finally {
        setLoading(false);
      }
    },
  });

  // Autenticação com o Meta
  const handleMetaAuth = async () => {
    try {
      setLoading(true);
      // Em um ambiente de produção, isso redirecionaria para a autenticação do Meta
      // Implementação temporária: usando a mesma API de login
      // Aqui você substituiria por uma chamada para a API de autenticação do Meta
      window.location.href = '/api/auth/meta'; // Redirecionamento para a rota de autenticação do Meta
    } catch (err: any) {
      const errorMessage = 'Erro ao iniciar autenticação com o Meta';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Meta Ads Analytics Dashboard
        </Typography>
        
        <Card sx={{ width: '100%', mt: 3 }}>
          <CardContent>
            <Typography variant="h5" component="h2" gutterBottom align="center">
              Login
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <form onSubmit={formik.handleSubmit}>
              <TextField
                fullWidth
                id="email"
                name="email"
                label="Email"
                variant="outlined"
                margin="normal"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
              />
              
              <TextField
                fullWidth
                id="password"
                name="password"
                label="Senha"
                type="password"
                variant="outlined"
                margin="normal"
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password && formik.errors.password}
              />
              
              <Button
                fullWidth
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                sx={{ mt: 3 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Entrar'}
              </Button>
            </form>
            
            <Box sx={{ my: 2, display: 'flex', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                ou
              </Typography>
            </Box>
            
            <Button
              fullWidth
              variant="outlined"
              color="primary"
              size="large"
              startIcon={<FacebookIcon />}
              onClick={handleMetaAuth}
              disabled={loading}
            >
              Entrar com Meta
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default LoginPage;
