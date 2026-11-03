export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  created_at: string;
  measurements?: {
    height?: number;
    weight?: number;
    chest?: number;
    waist?: number;
    hip?: number;
    preferred_fit?: 'slim' | 'regular' | 'relaxed';
  };
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parent?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  brand: string;
  price: number;
  colors: string[];
  sizes: string[];
  stock: number;
  garment_type: 'upper_body' | 'lower_body' | 'full_body' | 'accessory';
  images: string[];
  tags: string[];
  is_active: boolean;
  created_at: string;
}

export interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TryOnJob {
  job_id: string;
  status: 'queued' | 'processing' | 'done' | 'failed' | 'unavailable';
  message: string;
  original_image_url?: string;
  generated_image_url?: string;
  product_id?: string;
  created_at: string;
  completed_at?: string;
  processing_time_seconds?: number;
}

export interface TryOnHistoryItem {
  id: string;
  job_id: string;
  product_id: string;
  product_name: string;
  original_image_url: string;
  generated_image_url?: string;
  status: string;
  created_at: string;
}

export interface FavoriteItem {
  id: string;
  product_id: string;
  product_name: string;
  product_price: number;
  product_images: string[];
  created_at: string;
}

export interface WardrobeItem {
  id: string;
  product_id: string;
  product_name: string;
  generated_result_url: string;
  note: string;
  created_at: string;
}

export interface SizeRecommendation {
  recommended_size: string;
  confidence: 'high' | 'medium' | 'low';
  disclaimer: string;
  size_chart: Record<string, string>;
}

export interface AdminStats {
  total_users: number;
  total_products: number;
  total_tryon_requests: number;
  successful_tryons: number;
  failed_tryons: number;
  pending_tryons: number;
  new_users_last_7_days: number;
  new_tryons_last_7_days: number;
}
