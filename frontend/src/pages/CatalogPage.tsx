import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  Sparkles,
  Heart,
} from 'lucide-react';
import { productService, favoriteService } from '../services/api';
import type { Product, Category } from '../types';
import { useAuth } from '../context/AuthContext';

export const CatalogPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [favoritesMap, setFavoritesMap] = useState<Record<string, boolean>>({});

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await productService.getProducts({
        category: selectedCategory || undefined,
        search: search || undefined,
        size: selectedSize || undefined,
        color: selectedColor || undefined,
        sort_by: sortBy,
        sort_order: sortOrder,
        page_size: 24,
      });
      setProducts(res.items);
    } catch (err) {
      console.error('Failed to load products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    productService.getCategories().then(setCategories).catch(console.error);
    if (isAuthenticated) {
      favoriteService.getFavorites().then((favs) => {
        const map: Record<string, boolean> = {};
        favs.forEach((f) => {
          map[f.product_id] = true;
        });
        setFavoritesMap(map);
      });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, selectedSize, selectedColor, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadProducts();
  };

  const toggleFavorite = async (productId: string) => {
    if (!isAuthenticated) {
      alert('Please sign in to save items to your favorites.');
      return;
    }
    try {
      if (favoritesMap[productId]) {
        // remove
        setFavoritesMap((prev) => ({ ...prev, [productId]: false }));
      } else {
        await favoriteService.addFavorite(productId);
        setFavoritesMap((prev) => ({ ...prev, [productId]: true }));
      }
    } catch (err) {
      console.error('Failed to toggle favorite', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Fashion Catalog</h1>
        <p className="text-sm text-slate-500 mt-1">
          Explore clothing, discover fits, and launch instant virtual fittings.
        </p>
      </div>

      {/* Search & Top Controls */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, brand, or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 transition"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Size Filter */}
          <select
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Sizes</option>
            <option value="XS">XS</option>
            <option value="S">S</option>
            <option value="M">M</option>
            <option value="L">L</option>
            <option value="XL">XL</option>
            <option value="XXL">XXL</option>
          </select>

          {/* Sort By */}
          <select
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split(':');
              setSortBy(sb);
              setSortOrder(so);
            }}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="created_at:desc">Newest Arrivals</option>
            <option value="price:asc">Price: Low to High</option>
            <option value="price:desc">Price: High to Low</option>
            <option value="name:asc">Name: A to Z</option>
          </select>

          {(selectedCategory || selectedSize || search) && (
            <button
              onClick={() => {
                setSelectedCategory('');
                setSelectedSize('');
                setSelectedColor('');
                setSearch('');
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="h-80 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-sm">No products matched your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((prod) => (
            <div
              key={prod.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition flex flex-col group relative"
            >
              {/* Product Image */}
              <div className="h-64 bg-slate-100 overflow-hidden relative">
                {prod.images?.[0] ? (
                  <img
                    src={prod.images[0]}
                    alt={prod.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    No image
                  </div>
                )}

                {/* Category tag */}
                <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-slate-800 text-[11px] font-semibold px-2 py-0.5 rounded-md shadow-xs">
                  {prod.category}
                </span>

                {/* Favorite button */}
                <button
                  onClick={() => toggleFavorite(prod.id)}
                  className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition ${
                    favoritesMap[prod.id]
                      ? 'bg-rose-50 text-rose-600'
                      : 'bg-white/80 text-slate-600 hover:text-rose-600'
                  }`}
                  title={favoritesMap[prod.id] ? 'In favorites' : 'Add to favorites'}
                >
                  <Heart
                    className={`w-4 h-4 ${favoritesMap[prod.id] ? 'fill-rose-600' : ''}`}
                  />
                </button>
              </div>

              {/* Details */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm truncate">{prod.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{prod.brand || 'AuraFit'}</p>

                  <div className="flex items-baseline justify-between mt-2">
                    <p className="text-base font-bold text-slate-900">${prod.price.toFixed(2)}</p>
                    <span className="text-[11px] text-slate-400 uppercase font-medium">
                      {prod.garment_type.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Colors & Sizes preview */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {prod.colors?.slice(0, 3).map((col, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                      >
                        {col}
                      </span>
                    ))}
                    {prod.sizes?.slice(0, 3).map((sz, i) => (
                      <span
                        key={i}
                        className="text-[10px] border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded"
                      >
                        {sz}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  <Link
                    to={`/products/${prod.id}`}
                    className="flex-1 py-2 text-center border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
                  >
                    Details
                  </Link>
                  <Link
                    to={`/tryon?product=${prod.id}`}
                    className="flex-1 py-2 text-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Try Now
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
