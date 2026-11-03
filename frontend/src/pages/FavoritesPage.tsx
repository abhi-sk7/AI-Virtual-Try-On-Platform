import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2, Sparkles, ShoppingBag } from 'lucide-react';
import { favoriteService } from '../services/api';
import type { FavoriteItem } from '../types';

export const FavoritesPage: React.FC = () => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = () => {
    favoriteService
      .getFavorites()
      .then(setFavorites)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const handleRemove = async (id: string) => {
    try {
      await favoriteService.removeFavorite(id);
      setFavorites((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error('Failed to remove favorite', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
            Wishlist & Favorites
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Garments you have shortlisted for upcoming fittings and purchase.
          </p>
        </div>
        <Link
          to="/catalog"
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs shadow-sm transition flex items-center gap-1.5"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          Continue Browsing
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-80 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
            <Heart className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800">Your wishlist is empty</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Click the heart icon on any product in the catalog to quickly bookmark items here.
          </p>
          <Link
            to="/catalog"
            className="inline-flex px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
          >
            Explore Catalog
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col group relative"
            >
              <div className="h-64 bg-slate-100 overflow-hidden relative">
                {fav.product_images?.[0] ? (
                  <img
                    src={fav.product_images[0]}
                    alt={fav.product_name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    No image
                  </div>
                )}
                <button
                  onClick={() => handleRemove(fav.id)}
                  className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm text-slate-500 hover:text-rose-600 rounded-full shadow-xs transition"
                  title="Remove from favorites"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm truncate">{fav.product_name}</h3>
                  <p className="text-base font-bold text-slate-900 mt-1">
                    ${fav.product_price.toFixed(2)}
                  </p>
                </div>

                <div className="pt-4 flex gap-2">
                  <Link
                    to={`/products/${fav.product_id}`}
                    className="flex-1 py-2 text-center border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition"
                  >
                    Details
                  </Link>
                  <Link
                    to={`/tryon?product=${fav.product_id}`}
                    className="flex-1 py-2 text-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition flex items-center justify-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Try On
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
