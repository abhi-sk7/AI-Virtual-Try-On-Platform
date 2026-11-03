import axios from 'axios';
import type {
  AuthResponse,
  Category,
  Product,
  ProductListResponse,
  TryOnJob,
  TryOnHistoryItem,
  FavoriteItem,
  WardrobeItem,
  SizeRecommendation,
  AdminStats,
  User,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject bearer token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/login', { email, password });
    return res.data;
  },
  register: async (name: string, email: string, password: string): Promise<AuthResponse> => {
    const res = await api.post<AuthResponse>('/auth/register', { name, email, password });
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },
  updateProfile: async (data: Partial<User> & { height?: number; weight?: number; chest?: number; waist?: number; hip?: number; preferred_fit?: string }): Promise<User> => {
    const res = await api.put<User>('/auth/me', data);
    return res.data;
  },
};

// Products Service
export const productService = {
  getProducts: async (params?: {
    page?: number;
    page_size?: number;
    category?: string;
    search?: string;
    min_price?: number;
    max_price?: number;
    color?: string;
    size?: string;
    sort_by?: string;
    sort_order?: string;
  }): Promise<ProductListResponse> => {
    const res = await api.get<ProductListResponse>('/products', { params });
    return res.data;
  },
  getProduct: async (id: string): Promise<Product> => {
    const res = await api.get<Product>(`/products/${id}`);
    return res.data;
  },
  createProduct: async (data: Partial<Product>): Promise<Product> => {
    const res = await api.post<Product>('/products', data);
    return res.data;
  },
  updateProduct: async (id: string, data: Partial<Product>): Promise<Product> => {
    const res = await api.put<Product>(`/products/${id}`, data);
    return res.data;
  },
  deleteProduct: async (id: string): Promise<void> => {
    await api.delete(`/products/${id}`);
  },
  uploadProductImage: async (productId: string, file: File): Promise<Product> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<Product>(`/products/${productId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  getCategories: async (): Promise<Category[]> => {
    const res = await api.get<Category[]>('/categories');
    return res.data;
  },
};

// Virtual Try-On Service
export const tryonService = {
  submitTryOn: async (personImage: File, productId: string): Promise<TryOnJob> => {
    const formData = new FormData();
    formData.append('person_image', personImage);
    formData.append('product_id', productId);
    const res = await api.post<TryOnJob>('/tryon/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  getJobStatus: async (jobId: string): Promise<TryOnJob> => {
    const res = await api.get<TryOnJob>(`/tryon/status/${jobId}`);
    return res.data;
  },
  getHistory: async (): Promise<TryOnHistoryItem[]> => {
    const res = await api.get<TryOnHistoryItem[]>('/tryon/history');
    return res.data;
  },
  getRecommendation: async (data: {
    height: number;
    weight: number;
    chest?: number;
    waist?: number;
    hip?: number;
    preferred_fit?: string;
    product_id: string;
  }): Promise<SizeRecommendation> => {
    const res = await api.post<SizeRecommendation>('/tryon/size-recommend', data);
    return res.data;
  },
};

// Favorites Service
export const favoriteService = {
  getFavorites: async (): Promise<FavoriteItem[]> => {
    const res = await api.get<FavoriteItem[]>('/favorites');
    return res.data;
  },
  addFavorite: async (productId: string): Promise<{ id: string; message: string }> => {
    const res = await api.post<{ id: string; message: string }>('/favorites', null, {
      params: { product_id: productId },
    });
    return res.data;
  },
  removeFavorite: async (id: string): Promise<void> => {
    await api.delete(`/favorites/${id}`);
  },
};

// Wardrobe Service
export const wardrobeService = {
  getWardrobe: async (): Promise<WardrobeItem[]> => {
    const res = await api.get<WardrobeItem[]>('/wardrobe');
    return res.data;
  },
  saveToWardrobe: async (productId: string, generatedResultUrl: string, note?: string): Promise<{ id: string }> => {
    const res = await api.post<{ id: string }>('/wardrobe', null, {
      params: {
        product_id: productId,
        generated_result_url: generatedResultUrl,
        note: note || '',
      },
    });
    return res.data;
  },
  removeFromWardrobe: async (id: string): Promise<void> => {
    await api.delete(`/wardrobe/${id}`);
  },
};

// Admin Service
export const adminService = {
  getDashboardStats: async (): Promise<AdminStats> => {
    const res = await api.get<AdminStats>('/admin/dashboard');
    return res.data;
  },
  getUsers: async (): Promise<User[]> => {
    const res = await api.get<User[]>('/admin/users');
    return res.data;
  },
};

export default api;
