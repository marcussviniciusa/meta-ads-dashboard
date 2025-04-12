import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Card,
  CardContent,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  SelectChangeEvent,
  Chip,
} from '@mui/material';
import Layout from '../components/Layout';
import api from '../services/api';
import authService from '../services/authService';

// Interface para anúncios
interface Ad {
  id: string;
  name: string;
  status: string;
  previewUrl: string;
  metrics: {
    impressions: number;
    clicks: number;
    spend: number;
    ctr: number;
    cpc: number;
  };
  createdAt: string;
  updatedAt: string;
  adAccountId: string;
  adAccountName: string;
}

// Interface para as empresas
interface Company {
  _id: string;
  name: string;
  metaAdAccounts: Array<{
    accountId: string;
    name: string;
    status: string;
  }>;
}

// Componente para exibir imagem de prévia com fallback para erros
const AdPreviewImage: React.FC<{ previewUrl: string, adName: string }> = ({ previewUrl, adName }) => {
  const [imgError, setImgError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [imageSrc, setImageSrc] = useState<string>('');
  
  // Criar uma URL fixa para o placeholder
  const placeholderUrl = `${window.location.origin.replace('5173', '5000')}/ad-images/placeholder.svg`;
  
  // Função para log de debugging
  const logImageInfo = (message: string, url?: string) => {
    // No ambiente Vite, usamos import.meta.env ao invés de process.env
    if (import.meta.env.MODE !== 'production') {
      console.log(`[AdPreviewImage] ${message}`, url || '');
    }
  };
  
  // Processar a URL da imagem para usar nosso proxy
  useEffect(() => {
    try {
      // Resetar estados ao mudar a URL
      setImgError(false);
      setLoading(true);
      
      // Se a URL for vazia ou inválida, usar o placeholder
      if (!previewUrl || previewUrl === 'undefined' || previewUrl === 'null') {
        console.log('URL inválida, usando placeholder');
        setImageSrc(placeholderUrl);
        setLoading(false);
        return;
      }
      
      // Substituir placekitten e placeholder.com por placeholder local
      if (previewUrl.includes('placeholder.com') || previewUrl.includes('placekitten.com')) {
        console.log('URL de placeholder externa, usando local');
        setImageSrc(placeholderUrl);
        setLoading(false);
        return;
      }
      
      // Obter a URL base do backend (porta 5000 em vez de 5173 do frontend)
      const baseUrl = window.location.origin.replace('5173', '5000');
      
      // VERIFICAR se a URL já está usando o proxy para evitar duplo encapsulamento
      if (previewUrl.includes('/api/images/ad-preview')) {
        // A URL já foi processada anteriormente, não precisamos adicionar o proxy novamente
        // Apenas garantimos que tenha o baseUrl correto
        let finalUrl = previewUrl;
        
        // Garantir que a URL tenha o formato correto com o host
        if (!previewUrl.startsWith('http')) {
          // Se começar com / (path absoluto), adicionar apenas o baseUrl
          if (previewUrl.startsWith('/')) {
            finalUrl = `${baseUrl}${previewUrl}`;
          } else {
            // Se não começar com /, adicionar / antes
            finalUrl = `${baseUrl}/${previewUrl}`;
          }
        }
        
        logImageInfo('URL já com proxy, usando diretamente:', finalUrl);
        setImageSrc(finalUrl);
      } else {
        // Para URLs externas, adicionar o proxy
        const safeUrl = encodeURIComponent(previewUrl.trim());
        const proxyUrl = `${baseUrl}/api/images/ad-preview?url=${safeUrl}`;
        logImageInfo('Adicionando proxy à imagem:', proxyUrl);
        setImageSrc(proxyUrl);
      }
    } catch (error) {
      console.error('Erro ao processar URL da imagem:', error);
      setImgError(true);
      setLoading(false);
      setImageSrc(placeholderUrl);
    }
  }, [previewUrl, placeholderUrl]);
  
  const handleError = () => {
    console.error('Erro ao carregar a imagem:', previewUrl);
    console.error('Imagem source que falhou:', imageSrc);
    setImgError(true);
    setLoading(false);
    setImageSrc(placeholderUrl); // Usar placeholder em caso de erro
  };
  
  const handleLoad = () => {
    logImageInfo('Imagem carregada com sucesso:', previewUrl);
    setLoading(false);
  };
  
  // Renderizar diretamente o placeholder se houver erro
  if (imgError) {
    return (
      <Box sx={{ position: 'relative', height: 300, bgcolor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Box 
          sx={{ 
            height: '100%',
            width: '100%',
            backgroundColor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            padding: 2,
            textAlign: 'center'
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Não foi possível carregar a prévia
          </Typography>
          <Typography variant="body1" mt={1}>
            {adName}
          </Typography>
        </Box>
      </Box>
    );
  }
  
  return (
    <Box sx={{ position: 'relative', height: 300, bgcolor: '#f5f5f5', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {loading && (
        <Box sx={{ position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', zIndex: 1 }}>
          <CircularProgress size={40} />
        </Box>
      )}
      
      {imageSrc && !imgError ? (
        <img 
          src={imageSrc} 
          alt={`Prévia do anúncio ${adName}`}
          onError={handleError}
          onLoad={handleLoad}
          style={{ 
            objectFit: 'contain',
            display: 'block',
            backgroundColor: '#ffffff',
            width: 'auto',
            height: 'auto',
            maxWidth: '100%',
            maxHeight: '280px',
            border: '1px solid #eaeaea',
            padding: '5px',
            borderRadius: '4px'
          }}
        />
      ) : !loading && !imageSrc && (
        <Box 
          sx={{ 
            height: '100%',
            width: '100%',
            backgroundColor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            padding: 2,
            textAlign: 'center'
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Não foi possível carregar a prévia
          </Typography>
          <Typography variant="body1" mt={1}>
            {adName}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const AdPreviews: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [ads, setAds] = useState<Ad[]>([]);
  const [filteredAds, setFilteredAds] = useState<Ad[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar empresas ao montar o componente
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Atualizar contas de anúncios quando a empresa for selecionada
  useEffect(() => {
    if (selectedCompany) {
      // Quando uma empresa é selecionada, limpar a conta de anúncio selecionada
      setSelectedAccount('');
      setAds([]);
      setFilteredAds([]);
    }
  }, [selectedCompany]);

  // Buscar os anúncios quando uma conta for selecionada
  useEffect(() => {
    if (selectedAccount) {
      fetchAds();
    }
  }, [selectedAccount]);

  // Filtrar anúncios com base no termo de busca
  useEffect(() => {
    if (ads.length > 0) {
      filterAds();
    }
  }, [searchTerm, ads]);

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
        
        // Se houver apenas uma empresa e ela existir, selecione-a automaticamente
        if (userCompany.length === 1) {
          setSelectedCompany(userCompany[0]._id);
        }
      } else {
        setCompanies([]);
      }
    } catch (err: any) {
      setError('Erro ao carregar empresas');
      console.error('Erro ao buscar empresas:', err);
    }
  };

  // Buscar anúncios da conta selecionada
  const fetchAds = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Buscando anúncios para a conta:', selectedAccount);
      
      const response = await api.get(`/ads/${selectedAccount}`, {
        params: {
          limit: 20
        }
      });
      
      // Verificar se a resposta indica que são dados simulados
      const isMockData = response.data?.isMock === true;
      
      if (isMockData) {
        console.warn('ATENÇÃO: Usando dados simulados em vez de dados reais da API do Facebook');
        setError('Dados simulados: O sistema está usando dados de exemplo em vez de dados reais do Facebook');
      } else {
        console.log('Usando dados reais da API do Facebook');
      }
      
      // Verificar se temos anúncios na resposta (considerando a estrutura aninhada)
      const adsArray = response.data?.data?.data || [];
      if (adsArray.length > 0) {
        // Processar dados (reais ou simulados)
        const processedAds: Ad[] = adsArray.map((adData: any) => {
          // Extrair URL da imagem de várias possíveis fontes
          let originalImageUrl = '';
          
          // Tentar obter a imagem em ordem de prioridade
          if (adData.preview_url && adData.preview_url !== 'null' && adData.preview_url !== 'undefined') {
            originalImageUrl = adData.preview_url;
          } else if (adData.creative?.thumbnail_url) {
            originalImageUrl = adData.creative.thumbnail_url;
          } else if (adData.creative?.image_url) {
            originalImageUrl = adData.creative.image_url;
          } else if (adData.adcreatives?.data?.[0]?.thumbnail_url) {
            originalImageUrl = adData.adcreatives.data[0].thumbnail_url;
          } else if (adData.adcreatives?.data?.[0]?.image_url) {
            originalImageUrl = adData.adcreatives.data[0].image_url;
          }
          
          // Se não encontrou nenhuma imagem, tentar gerar uma imagem do anúncio pelo ID
          if (!originalImageUrl && adData.id) {
            originalImageUrl = `https://www.facebook.com/ads/archive/render_ad/?id=${adData.id}`;
          }
          
          // Usar nosso proxy de imagens para todas as URLs de imagem
          // Isso resolve problemas de CORS conforme nossa abordagem implementada anteriormente
          let imageUrl = '';
          if (originalImageUrl) {
            // Usar o proxy de imagens para evitar problemas de CORS
            imageUrl = `/api/images/ad-preview?url=${encodeURIComponent(originalImageUrl)}`;
          }
          
          // Log detalhado para debug
          console.log(`Ad ${adData.id} - ${adData.name}:`);
          console.log(' - Status:', adData.effective_status || adData.status);
          console.log(' - preview_url:', adData.preview_url);
          console.log(' - imageUrl encontrada:', imageUrl);
          
          return {
            id: adData.id,
            name: adData.name,
            status: adData.effective_status || adData.status,
            previewUrl: imageUrl,
            metrics: {
              impressions: adData.insights?.data?.[0]?.impressions || 0,
              clicks: adData.insights?.data?.[0]?.clicks || 0,
              spend: parseFloat(adData.insights?.data?.[0]?.spend || '0'),
              ctr: parseFloat(adData.insights?.data?.[0]?.ctr || '0'),
              cpc: parseFloat(adData.insights?.data?.[0]?.cpc || '0')
            },
            createdAt: adData.created_time || new Date().toISOString(),
            updatedAt: adData.updated_time || new Date().toISOString(),
            adAccountId: selectedAccount,
            adAccountName: companies.find(c => c._id === selectedCompany)?.metaAdAccounts.find(a => a.accountId === selectedAccount)?.name || ''
          };
        });
        
        // Contar anúncios com imagens
        const adsWithImages = processedAds.filter(ad => ad.previewUrl && ad.previewUrl.length > 0).length;
        
        console.log(`Carregados ${processedAds.length} anúncios${isMockData ? ' simulados' : ' reais'}`);
        console.log(`Anúncios com imagens: ${adsWithImages} de ${processedAds.length}`);
        
        if (processedAds.length > 0) {
          console.log('Exemplo do primeiro anúncio:', processedAds[0]);
        }
        
        setAds(processedAds);
        setFilteredAds(processedAds);
      } else {
        // Se não houver dados na resposta
        console.warn('Nenhum anúncio encontrado para esta conta');
        setError('Nenhum anúncio disponível para esta conta de anúncios.');
        setAds([]);
        setFilteredAds([]);
      }
    } catch (err: any) {
      console.error('Erro ao buscar anúncios:', err);
      
      // Mensagem de erro mais detalhada
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao carregar anúncios';
      setError(`Erro ao carregar anúncios: ${errorMessage}`);
      
      // Limpar dados em caso de erro
      setAds([]);
      setFilteredAds([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar anúncios com base no termo de busca
  const filterAds = () => {
    if (!searchTerm.trim()) {
      setFilteredAds(ads);
      return;
    }
    
    const filtered = ads.filter(ad => 
      ad.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAds(filtered);
  };

  // Handlers para mudanças nos selects
  const handleCompanyChange = (event: SelectChangeEvent) => {
    setSelectedCompany(event.target.value);
  };

  const handleAccountChange = (event: SelectChangeEvent) => {
    setSelectedAccount(event.target.value);
  };

  // Handler para mudança no campo de busca
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Formatar números com separador de milhares
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  // Formatar porcentagem
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <Layout title="Pré-visualização de Anúncios">
      <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Pré-visualização de Anúncios
        </Typography>

        <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            {/* Seletor de Empresa */}
            <Box sx={{ flex: 1 }}>
              <FormControl fullWidth>
                <InputLabel id="company-select-label">Empresa</InputLabel>
                <Select
                  labelId="company-select-label"
                  id="company-select"
                  value={selectedCompany}
                  label="Empresa"
                  onChange={handleCompanyChange}
                >
                  {companies.map((company) => (
                    <MenuItem key={company._id} value={company._id}>
                      {company.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Seletor de Conta de Anúncio */}
            <Box sx={{ flex: 1 }}>
              <FormControl fullWidth disabled={!selectedCompany}>
                <InputLabel id="account-select-label">Conta de Anúncio</InputLabel>
                <Select
                  labelId="account-select-label"
                  id="account-select"
                  value={selectedAccount}
                  label="Conta de Anúncio"
                  onChange={handleAccountChange}
                >
                  {selectedCompany && companies
                    .find(c => c._id === selectedCompany)
                    ?.metaAdAccounts.map((account) => (
                      <MenuItem key={account.accountId} value={account.accountId}>
                        {account.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Box>

            {/* Campo de Busca */}
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                label="Buscar anúncios"
                variant="outlined"
                value={searchTerm}
                onChange={handleSearchChange}
                disabled={!selectedAccount}
              />
            </Box>
          </Box>
        </Paper>

        {/* Exibição de Erro */}
        {error && (
          <Box sx={{ mb: 4 }}>
            <Typography color="error" variant="body1">
              {error}
            </Typography>
          </Box>
        )}

        {/* Indicador de Carregamento */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Lista de Anúncios */}
        {!loading && selectedAccount && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {filteredAds.length > 0 ? (
              filteredAds.map((ad) => (
                <Box key={ad.id} sx={{ width: { xs: '100%', md: 'calc(50% - 12px)' } }}>
                  <Card elevation={3}>
                    {/* Prévia do Anúncio */}
                    <AdPreviewImage 
                      previewUrl={ad.previewUrl || `https://via.placeholder.com/400x300?text=${encodeURIComponent(ad.name)}`}
                      adName={ad.name}
                    />
                    
                    {/* Informações do Anúncio */}
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" component="div">
                          {ad.name}
                        </Typography>
                        <Chip 
                          label={ad.status === 'ACTIVE' ? 'Ativo' : 'Pausado'} 
                          color={ad.status === 'ACTIVE' ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      
                      <Divider sx={{ mb: 2 }} />
                      
                      <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                        <Box sx={{ width: '50%', mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Impressões
                          </Typography>
                          <Typography variant="body1">
                            {formatNumber(ad.metrics.impressions)}
                          </Typography>
                        </Box>
                        <Box sx={{ width: '50%', mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Cliques
                          </Typography>
                          <Typography variant="body1">
                            {formatNumber(ad.metrics.clicks)}
                          </Typography>
                        </Box>
                        <Box sx={{ width: '50%', mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            CTR
                          </Typography>
                          <Typography variant="body1">
                            {formatPercent(ad.metrics.ctr)}
                          </Typography>
                        </Box>
                        <Box sx={{ width: '50%', mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            CPC Médio
                          </Typography>
                          <Typography variant="body1">
                            {formatCurrency(ad.metrics.cpc)}
                          </Typography>
                        </Box>
                        <Box sx={{ width: '100%' }}>
                          <Typography variant="body2" color="text.secondary">
                            Investimento Total
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            {formatCurrency(ad.metrics.spend)}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Box>
              ))
            ) : (
              <Box sx={{ width: '100%' }}>
                <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body1">
                    {searchTerm.trim() 
                      ? 'Nenhum anúncio encontrado com este termo de busca.' 
                      : 'Nenhum anúncio disponível para esta conta.'}
                  </Typography>
                </Paper>
              </Box>
            )}
          </Box>
        )}

        {/* Mensagem para selecionar conta de anúncios */}
        {!loading && !selectedAccount && (
          <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body1">
              {selectedCompany 
                ? 'Selecione uma conta de anúncios para visualizar as prévias.' 
                : 'Selecione uma empresa e uma conta de anúncios para visualizar as prévias.'}
            </Typography>
          </Paper>
        )}
      </Container>
    </Layout>
  );
};

export default AdPreviews;
