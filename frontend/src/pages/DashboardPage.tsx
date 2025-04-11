import { useState, useEffect, useRef } from 'react';
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
  SelectChangeEvent,
  Typography
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
  const dataFetchedRef = useRef(false);
  
  // Log para debugging
  console.log('Estado atual do dashboard:', { 
    isSuperAdmin, 
    selectedCompany, 
    accounts, 
    selectedAccount,
    dataFetched: dataFetchedRef.current
  });

  useEffect(() => {
    // Se já carregou, não carrega novamente
    if (dataFetchedRef.current) {
      console.log('Os dados já foram carregados anteriormente, pulando fetchData');
      return;
    }

    console.log('Iniciando carregamento de dados, carregará apenas uma vez');

    // Função para buscar dados na API
    const fetchData = async () => {
      try {
        console.log('Executando fetchData');
        setLoading(true);
        setError(null);

        // Se for usuário comum e não tiver empresa definida, não podemos carregar nada
        if (!isSuperAdmin && (!user || !user.company)) {
          console.log('[DashboardPage] Usuário não tem empresa associada');
          return;
        }
        
        // Se for superadmin, carregar todas as empresas
        // Se for usuário comum, carregar apenas sua empresa
        if (isSuperAdmin) {
          console.log('[DashboardPage] Buscando todas as empresas');
          const response = await api.get('/companies');
          const companiesData = response.data.data;
          
          // Atualizar o estado com as empresas carregadas
          setCompanies(companiesData);
          
          // Se houver apenas uma empresa para o superadmin, selecionar automaticamente
          if (companiesData.length === 1) {
            const company = companiesData[0];
            console.log('[DashboardPage] Selecionando automaticamente a única empresa para superadmin:', company.name);
            
            // Definir empresa selecionada e suas contas
            setSelectedCompany(company._id);
            
            // Garantir que metaAdAccounts seja um array
            const adAccounts = Array.isArray(company.metaAdAccounts) ? company.metaAdAccounts : [];
            setAccounts(adAccounts);
            
            // Se houver apenas uma conta de anúncios, selecioná-la automaticamente
            if (adAccounts.length === 1) {
              const account = adAccounts[0];
              console.log('[DashboardPage] Selecionando automaticamente a única conta:', account.name);
              setSelectedAccount(account.accountId);
            }
          }
        } else {
          // Carregar a empresa do usuário normal
          console.log('[DashboardPage] Buscando empresa específica do usuário:', user.company);
          const response = await api.get(`/companies/${user.company}`);
          const companyData = response.data.data;
          
          // Logs detalhados para debug
          console.log('[DashboardPage] Dados completos da empresa:', JSON.stringify(companyData, null, 2));
          
          // Garantir que metaAdAccounts seja um array
          const adAccounts = Array.isArray(companyData.metaAdAccounts) ? companyData.metaAdAccounts : [];
          console.log('[DashboardPage] Contas de anúncio encontradas:', adAccounts.length);

          // Definir todos os estados relevantes ao mesmo tempo
          setCompanies([companyData]);
          setSelectedCompany(companyData._id);
          setAccounts(adAccounts);
          
          // Se houver pelo menos uma conta, selecioná-la automaticamente
          if (adAccounts.length > 0) {
            console.log('[DashboardPage] Selecionando a primeira conta:', adAccounts[0].accountId, adAccounts[0].name);
            setSelectedAccount(adAccounts[0].accountId);
          } else {
            console.log('[DashboardPage] ALERTA: A empresa não tem contas de anúncio!');
          }
        }
        
        // Marcar que os dados foram carregados com sucesso apenas DEPOIS de processar tudo
        dataFetchedRef.current = true;
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError('Ocorreu um erro ao carregar as empresas e contas de anúncios');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remover todas as dependências para garantir que execute apenas uma vez

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
                {/* Debug info */}
                <Box sx={{ mb: 1, display: 'none' }}>
                  <Typography variant="caption" color="text.secondary">
                    Debug: SelectedCompany: {selectedCompany}, Accounts: {accounts.length}, SelectedAccount: {selectedAccount}
                  </Typography>
                </Box>
                
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Conta de Anúncios</InputLabel>
                  <Select
                    value={selectedAccount}
                    onChange={(e) => {
                      console.log('Selecionando conta:', e.target.value);
                      setSelectedAccount(e.target.value);
                    }}
                    label="Conta de Anúncios"
                    // Remover a condição accounts.length === 0 para garantir que sempre
                    // seja possível selecionar mesmo que não tenha sido carregado ainda
                    disabled={loading || !selectedCompany}
                  >
                    <MenuItem value="">
                      <em>Selecione uma conta</em>
                    </MenuItem>
                    {accounts.length > 0 ? (
                      accounts.map((account) => (
                        <MenuItem 
                          key={account.accountId} 
                          value={account.accountId}
                          disabled={account.status !== 'active'}
                        >
                          {account.name || account.accountId}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem value="" disabled>
                        <em>Sem contas disponíveis</em>
                      </MenuItem>
                    )}
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
