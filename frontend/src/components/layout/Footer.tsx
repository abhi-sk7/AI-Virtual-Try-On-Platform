import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Shield, Cpu, ExternalLink } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-800">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-bold text-lg text-white">AuraFit AI</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Next-generation AI fashion virtual try-on technology combining deep learning diffusion models and real-time computer vision pose estimation.
            </p>
            <div className="flex items-center gap-2 text-xs text-indigo-400 bg-indigo-950/60 border border-indigo-800/60 px-3 py-1.5 rounded-lg w-fit">
              <Cpu className="w-3.5 h-3.5" />
              <span>IDM-VTON + MediaPipe Vision</span>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link to="/catalog" className="hover:text-white transition">
                  Fashion Catalog
                </Link>
              </li>
              <li>
                <Link to="/tryon" className="hover:text-white transition">
                  Photo AI Try-On
                </Link>
              </li>
              <li>
                <Link to="/tryon?mode=camera" className="hover:text-white transition">
                  Live Camera Studio
                </Link>
              </li>
              <li>
                <Link to="/wardrobe" className="hover:text-white transition">
                  My Wardrobe
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Categories
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li>Upper Body (Shirts, Hoodies, Jackets)</li>
              <li>Lower Body (Jeans, Trousers, Skirts)</li>
              <li>Full Body (Dresses, Jumpsuits)</li>
              <li>Accessories (Sunglasses, Watches)</li>
            </ul>
          </div>

          {/* Technology & Disclosure */}
          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              AI Transparency
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Photo try-on utilizes diffusion-based neural inpainting with identity-preserving warping. Live camera uses 33-point MediaPipe landmark overlay.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <Shield className="w-3.5 h-3.5" />
              <span>Privacy-first: Uploads deleted on demand</span>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} AuraFit Virtual Try-On Platform. Built for commercial fashion e-commerce.</p>
          <div className="flex items-center gap-6">
            <a href="/api/docs" target="_blank" rel="noreferrer" className="hover:text-slate-400 flex items-center gap-1">
              API Docs <ExternalLink className="w-3 h-3" />
            </a>
            <span>Backend: FastAPI + Motor + PyTorch</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
