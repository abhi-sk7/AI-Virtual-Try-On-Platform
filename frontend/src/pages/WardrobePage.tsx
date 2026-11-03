import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Trash2, Sparkles, ExternalLink } from 'lucide-react';
import { wardrobeService } from '../services/api';
import type { WardrobeItem } from '../types';

export const WardrobePage: React.FC = () => {
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWardrobe = () => {
    wardrobeService
      .getWardrobe()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadWardrobe();
  }, []);

  const handleRemove = async (id: string) => {
    try {
      await wardrobeService.removeFromWardrobe(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error('Failed to remove from wardrobe', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Bookmark className="w-7 h-7 text-indigo-600" />
            My Saved Wardrobe
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Your personal catalog of saved virtual try-on fittings and styling combinations.
          </p>
        </div>
        <Link
          to="/tryon"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          New Virtual Try-On
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-80 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
            <Bookmark className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-800">Your wardrobe is empty</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Perform a virtual try-on and click "Save Wardrobe" to preserve your favorite synthesized fittings here.
          </p>
          <Link
            to="/tryon"
            className="inline-flex px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
          >
            Launch Try-On Studio
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col group"
            >
              <div className="h-72 bg-slate-100 overflow-hidden relative">
                <img
                  src={item.generated_result_url}
                  alt={item.product_name}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <button
                  onClick={() => handleRemove(item.id)}
                  className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm text-slate-600 hover:text-rose-600 rounded-full shadow-xs transition"
                  title="Remove from wardrobe"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm truncate">{item.product_name}</h3>
                  {item.note && <p className="text-xs text-slate-500 mt-1">{item.note}</p>}
                  <p className="text-[10px] text-slate-400 mt-2">
                    Saved {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="pt-3 flex gap-2">
                  <a
                    href={item.generated_result_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-1.5 text-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition"
                  >
                    View HD <ExternalLink className="w-3 h-3" />
                  </a>
                  <Link
                    to={`/products/${item.product_id}`}
                    className="flex-1 py-1.5 text-center bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition"
                  >
                    Buy Garment
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
