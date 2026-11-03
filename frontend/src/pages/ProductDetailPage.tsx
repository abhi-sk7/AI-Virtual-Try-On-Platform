import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Sparkles,
  Heart,
  Ruler,
  ShieldCheck,
  Truck,
  RotateCcw,
  Camera,
  X,
} from 'lucide-react';
import { productService, favoriteService, tryonService } from '../services/api';
import type { Product, SizeRecommendation } from '../types';
import { useAuth } from '../context/AuthContext';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [isFavorite, setIsFavorite] = useState(false);

  // Size recommendation modal state
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [height, setHeight] = useState<number>(user?.measurements?.height || 175);
  const [weight, setWeight] = useState<number>(user?.measurements?.weight || 70);
  const [chest, setChest] = useState<number>(user?.measurements?.chest || 96);
  const [waist, setWaist] = useState<number>(user?.measurements?.waist || 80);
  const [hip, setHip] = useState<number>(user?.measurements?.hip || 98);
  const [preferredFit, setPreferredFit] = useState<'slim' | 'regular' | 'relaxed'>(
    user?.measurements?.preferred_fit || 'regular'
  );
  const [sizeRec, setSizeRec] = useState<SizeRecommendation | null>(null);
  const [recLoading, setRecLoading] = useState(false);

  useEffect(() => {
    if (id) {
      productService
        .getProduct(id)
        .then((p) => {
          setProduct(p);
          if (p.colors?.length) setSelectedColor(p.colors[0]);
          if (p.sizes?.length) setSelectedSize(p.sizes[0]);
        })
        .catch(console.error)
        .finally(() => setLoading(false));

      if (isAuthenticated) {
        favoriteService.getFavorites().then((favs) => {
          setIsFavorite(favs.some((f) => f.product_id === id));
        });
      }
    }
  }, [id, isAuthenticated]);

  const toggleFavorite = async () => {
    if (!isAuthenticated || !product) {
      alert('Please sign in to save favorites.');
      return;
    }
    try {
      if (isFavorite) {
        setIsFavorite(false);
      } else {
        await favoriteService.addFavorite(product.id);
        setIsFavorite(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCalculateSize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setRecLoading(true);
    try {
      const res = await tryonService.getRecommendation({
        product_id: product.id,
        height,
        weight,
        chest,
        waist,
        hip,
        preferred_fit: preferredFit,
      });
      setSizeRec(res);
      setSelectedSize(res.recommended_size);
    } catch (err) {
      console.error('Failed to get size recommendation', err);
    } finally {
      setRecLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="h-96 bg-slate-100 rounded-3xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-slate-100 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-slate-100 rounded w-1/4 animate-pulse" />
            <div className="h-24 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">Product not found.</p>
        <Link to="/catalog" className="text-indigo-600 font-semibold mt-2 inline-block">
          Back to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Image Gallery */}
        <div className="space-y-4">
          <div className="h-[480px] bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 relative group">
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                No preview image
              </div>
            )}
            <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-md text-slate-800 text-xs font-semibold px-3 py-1 rounded-lg">
              {product.category}
            </span>
          </div>
        </div>

        {/* Product Information */}
        <div className="space-y-6">
          <div>
            <p className="text-xs font-semibold tracking-wider uppercase text-indigo-600">
              {product.brand || 'AuraFit Studio'}
            </p>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              {product.name}
            </h1>
            <p className="text-2xl font-bold text-slate-900 mt-2">${product.price.toFixed(2)}</p>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>

          {/* Color Selection */}
          {product.colors?.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Available Colors: <span className="text-slate-900 font-bold">{selectedColor}</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                      selectedColor === c
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Size Selection */}
          {product.sizes?.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Select Size: <span className="text-slate-900 font-bold">{selectedSize}</span>
                </label>
                <button
                  onClick={() => setShowSizeModal(true)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <Ruler className="w-3.5 h-3.5" />
                  Smart Size Guide
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSize(s)}
                    className={`w-12 h-10 rounded-lg text-xs font-bold border transition flex items-center justify-center ${
                      selectedSize === s
                        ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Virtual Try-On Action Bar */}
          <div className="pt-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to={`/tryon?product=${product.id}`}
                className="flex-1 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition hover:-translate-y-0.5"
              >
                <Sparkles className="w-4 h-4" />
                Try This Outfit (Photo AI)
              </Link>

              <Link
                to={`/tryon?mode=camera&product=${product.id}`}
                className="py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md shadow-emerald-200 flex items-center justify-center gap-2 transition hover:-translate-y-0.5"
              >
                <Camera className="w-4 h-4" />
                Live Camera
              </Link>

              <button
                onClick={toggleFavorite}
                className={`p-3.5 border rounded-xl transition flex items-center justify-center ${
                  isFavorite
                    ? 'border-rose-200 bg-rose-50 text-rose-600'
                    : 'border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600'
                }`}
                title="Add to Favorites"
              >
                <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-600' : ''}`} />
              </button>
            </div>
          </div>

          {/* Shipping & Confidence perks */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600" />
              <span>Complimentary shipping</span>
            </div>
            <div className="flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-emerald-600" />
              <span>30-Day returns</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Authentic quality</span>
            </div>
          </div>
        </div>
      </div>

      {/* Size Recommendation Modal */}
      {showSizeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 animate-in fade-in duration-200">
            <button
              onClick={() => setShowSizeModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Ruler className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-lg text-slate-900">AI Size Recommendation</h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Enter your body measurements to calculate your optimal size for this {product.garment_type.replace('_', ' ')}.
            </p>

            <form onSubmit={handleCalculateSize} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Height (cm)</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chest (cm)</label>
                  <input
                    type="number"
                    value={chest}
                    onChange={(e) => setChest(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Waist (cm)</label>
                  <input
                    type="number"
                    value={waist}
                    onChange={(e) => setWaist(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Hip (cm)</label>
                  <input
                    type="number"
                    value={hip}
                    onChange={(e) => setHip(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Fit Preference</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['slim', 'regular', 'relaxed'] as const).map((fit) => (
                    <button
                      key={fit}
                      type="button"
                      onClick={() => setPreferredFit(fit)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border capitalize ${
                        preferredFit === fit
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {fit}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={recLoading}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-sm transition"
              >
                {recLoading ? 'Calculating...' : 'Calculate Recommended Size'}
              </button>
            </form>

            {sizeRec && (
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-indigo-800 font-medium">Predicted Size:</span>
                  <span className="text-xl font-extrabold text-indigo-600">
                    {sizeRec.recommended_size}
                  </span>
                </div>
                <p className="text-[11px] text-indigo-700/80 leading-relaxed italic">
                  {sizeRec.disclaimer}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
