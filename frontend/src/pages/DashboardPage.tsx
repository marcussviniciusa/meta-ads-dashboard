import { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Grid, 
  FormControl, 
  InputLabel, 
  MenuItem, 
  Select, 
  CircularProgress,
  Alert,
  SelectChangeEvent
} from '@mui/material';
import Layout from '../components/Layout';
import MetricsDashboard from '../components/MetricsDashboard';
import authService from '../services/authService';
import api from '../services/api';

// Interfaces
interface Company {
  _id: string;
  name: string;
  metaAdAccounts: AdAccount[];
}

interface AdAccount {
  accountId: string;
  name: string;
  status: string;
}

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [accounts, setAccounts] = useState<AdAccount[]>([]);
  const user = authService.getUser();
  const isSuperAdmin = authService.isSuperAdmin();

  // Carregar empresas e contas de anúncios
  useEffect(() => {
    // Função para buscar dados na API
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Se for superadmin, carregar todas as empresas
        // Se for usuário comum, carregar apenas sua empresa
        let companiesData: Company[] = [];
        
        if (isSuperAdmin) {
          console.log('[DashboardPage] Buscando todas as empresas');
          const response = await api.get('/companies');
          companiesData = response.data.data;
        } else if (user && user.company) {
          console.log('[DashboardPage] Buscando empresa específica do usuário');
          const response = await api.get(`/companies/${user.company}`);
          companiesData = [response.data.data];
          // Selecionar automaticamente a única empresa do usuário
          setSelectedCompany(response.data.data._id);
        }
        
        setCompanies(companiesData);
        
        // Se houver apenas uma empresa, selecioná-la automaticamente
        if (companiesData.length === 1 && !selectedCompany) {
          setSelectedCompany(companiesData[0]._id);
          setAccounts(companiesData[0].metaAdAccounts || []);
          
          // Se houver apenas uma conta de anúncios, selecioná-la automaticamente
          if (companiesData[0].metaAdAccounts && companiesData[0].metaAdAccounts.length === 1) {
            setSelectedAccount(companiesData[0].metaAdAccounts[0].accountId);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Ocorreu um erro ao carregar as empresas e contas de anúncios');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    // Importante: adicionamos setError como dependência para evitar chamadas repetidas
    // por causa de operações de setError que resultam em re-renderizações
  }, [user, isSuperAdmin, setError]);

  // Atualizar contas de anúncios quando a empresa mudar
  const handleCompanyChange = (event: SelectChangeEvent<string>) => {
    const companyId = event.target.value;
    setSelectedCompany(companyId);
    setSelectedAccount(''); // Limpar a seleção de conta
    
    // Atualizar lista de contas de anúncios
    const company = companies.find(c => c._id === companyId);
    if (company) {
      setAccounts(company.metaAdAccounts || []);
      
      // Se houver apenas uma conta, selecioná-la automaticamente
      if (company.metaAdAccounts && company.metaAdAccounts.length === 1) {
        setSelectedAccount(company.metaAdAccounts[0].accountId);
      }
    } else {
      setAccounts([]);
    }
  };

  // Obter nome da conta selecionada
  const getSelectedAccountName = () => {
    const account = accounts.find(acc => acc.accountId === selectedAccount);
    return account ? account.name : selectedAccount;
  };

  return (
    <Layout title="Dashboard">
      <Box>
        {/* Seletores de empresa e conta */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Grid container spacing={3} sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)' }}>
              {isSuperAdmin && (
                <Grid sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Empresa</InputLabel>
                    <Select
                      value={selectedCompany}
                      onChange={handleCompanyChange}
                      label="Empresa"
                      disabled={loading}
                    >
                      <MenuItem value="">
                        <em>Selecione uma empresa</em>
                      </MenuItem>
                      {companies.map((company) => (
                        <MenuItem key={company._id} value={company._id}>
                          {company.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid sx={{ gridColumn: { xs: 'span 12', md: isSuperAdmin ? 'span 6' : 'span 12' } }}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Conta de Anúncios</InputLabel>
                  <Select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    label="Conta de Anúncios"
                    disabled={loading || !selectedCompany || accounts.length === 0}
                  >
                    <MenuItem value="">
                      <em>Selecione uma conta</em>
                    </MenuItem>
                    {accounts.map((account) => (
                      <MenuItem 
                        key={account.accountId} 
                        value={account.accountId}
                        disabled={account.status !== 'active'}
                      >
                        {account.name || account.accountId}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {error && !loading && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        {!loading && (!selectedCompany || !selectedAccount) && (
          <Alert severity="info">
            Por favor, selecione uma empresa e uma conta de anúncios para visualizar as métricas.
          </Alert>
        )}
        
        {selectedCompany && selectedAccount && (
          <MetricsDashboard 
            companyId={selectedCompany} 
            adAccountId={selectedAccount}
            adAccountName={getSelectedAccountName()}
          />
        )}
      </Box>
    </Layout>
  );
};

export default DashboardPage;
