import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Camera,
  Upload,
  ArrowRight,
  ShieldCheck,
  Zap,
  Ruler,
  CheckCircle,
} from 'lucide-react';
import { productService } from '../services/api';
import type { Product } from '../types';

export const HomePage: React.FC = () => {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService
      .getProducts({ page_size: 4 })
      .then((res) => setFeaturedProducts(res.items))
      .catch((err) => console.error('Failed to load featured products', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/60 via-purple-50/40 to-white pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              Next-Gen Fashion Intelligence
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Experience Fashion{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Before You Buy
              </span>
            </h1>

            <p className="text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Virtually try on premium clothing with photorealistic AI diffusion models or see instant live 2D garment overlays right in your webcam.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                to="/tryon"
                className="w-full sm:w-auto px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition hover:-translate-y-0.5"
              >
                <Upload className="w-4 h-4" />
                Upload Your Photo
              </Link>

              <Link
                to="/tryon?mode=camera"
                className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded-xl border border-slate-200 shadow-sm flex items-center justify-center gap-2 transition hover:-translate-y-0.5"
              >
                <Camera className="w-4 h-4 text-emerald-600" />
                Live Camera Try-On
              </Link>
            </div>

            {/* Micro proof badges */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-indigo-600" />
                IDM-VTON Neural Architecture
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Real-Time 33-Keypoint Pose Tracking
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-purple-600" />
                Intelligent Size Estimation
              </span>
            </div>
          </div>
        </div>

        {/* Decorative background glows */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none -z-0" />
        <div className="absolute top-1/3 right-1/4 -translate-y-1/2 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl pointer-events-none -z-0" />
      </section>

      {/* Categories Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Explore Categories</h2>
            <p className="text-sm text-slate-500 mt-1">
              Curated clothing ready for virtual fitting
            </p>
          </div>
          <Link
            to="/catalog"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            All Products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: 'Shirts & Tops', tag: 'Shirts', icon: '👔', desc: 'Oxford, casual & dress shirts' },
            { name: 'Hoodies & Sweaters', tag: 'Hoodies', icon: '🧥', desc: 'Streetwear & cozy fleeces' },
            { name: 'Jackets & Blazers', tag: 'Jackets', icon: '🧥', desc: 'Denim, leather & tailoring' },
            { name: 'Dresses & Sets', tag: 'Dresses', icon: '👗', desc: 'Midi dresses & jumpsuits' },
          ].map((cat, i) => (
            <Link
              key={i}
              to={`/catalog?category=${encodeURIComponent(cat.tag)}`}
              className="group p-6 bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 hover:shadow-md transition flex flex-col justify-between"
            >
              <div className="text-3xl mb-3">{cat.icon}</div>
              <div>
                <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">{cat.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Featured Fashion Pieces</h2>
            <p className="text-sm text-slate-500 mt-1">
              Popular garments ready for high-fidelity try-on
            </p>
          </div>
          <Link
            to="/catalog"
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            Browse All ({featuredProducts.length}) <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-80 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition flex flex-col group"
              >
                <div className="h-64 bg-slate-100 overflow-hidden relative">
                  {prod.images?.[0] ? (
                    <img
                      src={prod.images[0]}
                      alt={prod.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      No Image
                    </div>
                  )}
                  <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-slate-800 text-[11px] font-semibold px-2 py-0.5 rounded-md">
                    {prod.category}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm truncate">{prod.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{prod.brand || 'AuraFit'}</p>
                    <p className="text-base font-bold text-slate-900 mt-2">${prod.price.toFixed(2)}</p>
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
                      Try On
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How it Works */}
      <section className="bg-slate-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight">How Virtual Try-On Works</h2>
            <p className="text-sm text-slate-400 mt-2">
              Three seamless steps from wardrobe discovery to realistic visual validation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-800/60 border border-slate-700/60 p-6 rounded-2xl relative">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-lg mb-4">
                1
              </div>
              <h3 className="font-semibold text-lg text-white mb-2">Select Your Garment</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Choose any item from our catalog across upper-body, lower-body, full-body, or accessories.
              </p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 p-6 rounded-2xl relative">
              <div className="w-10 h-10 rounded-xl bg-purple-600/30 text-purple-400 flex items-center justify-center font-bold text-lg mb-4">
                2
              </div>
              <h3 className="font-semibold text-lg text-white mb-2">Upload or Use Webcam</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Upload a full-body photograph or start your webcam for real-time 33-point pose landmark tracking.
              </p>
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 p-6 rounded-2xl relative">
              <div className="w-10 h-10 rounded-xl bg-pink-600/30 text-pink-400 flex items-center justify-center font-bold text-lg mb-4">
                3
              </div>
              <h3 className="font-semibold text-lg text-white mb-2">AI Neural Synthesis</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Diffusion inpainting models synthesize realistic garment folds, lighting, and fit tailored to your posture.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Ruler className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-1">Smart Size Recommendation</h3>
              <p className="text-sm text-slate-600">
                Input your measurements (chest, waist, hip, height) and get automated sizing predictions with fit preferences.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-1">Dual Engine Flexibility</h3>
              <p className="text-sm text-slate-600">
                Switch effortlessly between high-precision photo diffusion synthesis and lightweight live camera 2D overlays.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 mb-1">Complete Privacy Control</h3>
              <p className="text-sm text-slate-600">
                Your uploaded images are processed securely, never public, and can be deleted from your wardrobe at any time.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
