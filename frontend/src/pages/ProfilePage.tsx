import React, { useState } from 'react';
import { User, Ruler, CheckCircle2, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/api';

export const ProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [height, setHeight] = useState(user?.measurements?.height || '');
  const [weight, setWeight] = useState(user?.measurements?.weight || '');
  const [chest, setChest] = useState(user?.measurements?.chest || '');
  const [waist, setWaist] = useState(user?.measurements?.waist || '');
  const [hip, setHip] = useState(user?.measurements?.hip || '');
  const [preferredFit, setPreferredFit] = useState<'slim' | 'regular' | 'relaxed'>(
    user?.measurements?.preferred_fit || 'regular'
  );

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);
    try {
      await authService.updateProfile({
        name,
        height: height ? Number(height) : undefined,
        weight: weight ? Number(weight) : undefined,
        chest: chest ? Number(chest) : undefined,
        waist: waist ? Number(waist) : undefined,
        hip: hip ? Number(hip) : undefined,
        preferred_fit: preferredFit,
      });
      await refreshUser();
      setSavedSuccess(true);
    } catch (err) {
      console.error('Failed to update profile', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <User className="w-7 h-7 text-indigo-600" />
          Profile & Body Sizing Profile
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your personal account and save your biometric measurements for accurate automated size recommendations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Account Info */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            Account Credentials
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-400 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Biometrics & Sizing */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-purple-600" />
              Body Measurements (for Size AI)
            </h2>
            <span className="text-[11px] text-slate-400">Used strictly for automated fit estimation</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Height (cm)</label>
              <input
                type="number"
                placeholder="e.g. 178"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Weight (kg)</label>
              <input
                type="number"
                placeholder="e.g. 72"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Chest (cm)</label>
              <input
                type="number"
                placeholder="e.g. 98"
                value={chest}
                onChange={(e) => setChest(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Waist (cm)</label>
              <input
                type="number"
                placeholder="e.g. 82"
                value={waist}
                onChange={(e) => setWaist(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hip (cm)</label>
              <input
                type="number"
                placeholder="e.g. 98"
                value={hip}
                onChange={(e) => setHip(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Preferred Fit Cut</label>
            <div className="grid grid-cols-3 gap-3">
              {(['slim', 'regular', 'relaxed'] as const).map((fit) => (
                <button
                  key={fit}
                  type="button"
                  onClick={() => setPreferredFit(fit)}
                  className={`py-2 text-xs font-semibold rounded-xl border capitalize transition ${
                    preferredFit === fit
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-xs'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {fit}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {savedSuccess && (
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Profile saved successfully!
            </span>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs shadow-sm transition"
            >
              {saving ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
