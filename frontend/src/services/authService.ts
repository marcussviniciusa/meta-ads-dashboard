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
      localStorage.setItem('user', JSON.stringify(response.data.user));
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
    return user ? JSON.parse(user) : null;
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
