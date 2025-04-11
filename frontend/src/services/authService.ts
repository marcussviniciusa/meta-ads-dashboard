import api from './api';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
}

interface UserFormValues {
  name: string;
  email: string;
  password: string;
  role: string;
  company: string;
}

interface AuthResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    company?: string; // Adicionar campo de empresa ao tipo de resposta
  };
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      
      // Assegurar que o objeto user tenha todos os campos necessários
      // Usando o getCurrentUser para obter todos os dados completos do usuário
      try {
        const userResponse = await api.get('/auth/me');
        const fullUserData = userResponse.data.data;
        console.log('Dados completos do usuário obtidos após login:', fullUserData);
        localStorage.setItem('user', JSON.stringify(fullUserData));
      } catch (error) {
        console.error('Erro ao obter dados completos do usuário, usando dados parciais:', error);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
    }
    return response.data;
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.get('/auth/logout');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  async getCurrentUser(): Promise<any> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  },

  getUser(): any {
    const user = localStorage.getItem('user');
    if (!user) return null;
    
    try {
      const userData = JSON.parse(user);
      console.log('Dados do usuário recuperados do localStorage:', userData);
      return userData;
    } catch (error) {
      console.error('Erro ao fazer parse dos dados do usuário:', error);
      return null;
    }
  },

  isSuperAdmin(): boolean {
    const user = this.getUser();
    return user && user.role === 'superadmin';
  },
  
  // Métodos para gerenciamento de usuários
  async getUsers(): Promise<ApiResponse<any[]>> {
    const response = await api.get('/users');
    return response.data;
  },
  
  async getUserById(id: string): Promise<ApiResponse<any>> {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  
  async createUser(data: UserFormValues): Promise<ApiResponse<any>> {
    const response = await api.post('/users', data);
    return response.data;
  },
  
  async updateUser(id: string, data: UserFormValues): Promise<ApiResponse<any>> {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },
  
  async deleteUser(id: string): Promise<ApiResponse<any>> {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
  
  // Métodos para gerenciamento de empresas
  async getCompanies(): Promise<ApiResponse<any[]>> {
    const response = await api.get('/companies');
    return response.data;
  }
};

export default authService;
