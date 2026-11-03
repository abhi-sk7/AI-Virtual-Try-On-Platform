import React, { useEffect, useState } from 'react';
import { History, CheckCircle2, Clock, AlertCircle, ExternalLink } from 'lucide-react';
import { tryonService } from '../services/api';
import type { TryOnHistoryItem } from '../types';

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<TryOnHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    tryonService
      .getHistory()
      .then(setHistory)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="pb-6 border-b border-slate-200">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <History className="w-7 h-7 text-indigo-600" />
          Virtual Try-On History
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Detailed log of your requested virtual try-on jobs, inference statuses, and generated outputs.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 space-y-3">
          <History className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-800">No try-on requests found</p>
          <p className="text-xs text-slate-400">
            Submit a photo in the Virtual Try-On studio to generate your first outfit preview.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="divide-y divide-slate-100">
            {history.map((item) => (
              <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition">
                <div className="flex items-center gap-4">
                  {/* Thumbnails */}
                  <div className="flex items-center -space-x-4">
                    <img
                      src={item.original_image_url}
                      alt="Input photo"
                      className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-xs"
                    />
                    {item.generated_image_url ? (
                      <img
                        src={item.generated_image_url}
                        alt="Output result"
                        className="w-14 h-14 rounded-xl object-cover border-2 border-white shadow-xs"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] text-slate-400 font-medium">
                        Waiting
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{item.product_name || 'Virtual Fitting'}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Requested {new Date(item.created_at).toLocaleString()}
                    </p>
                    <span className="text-[11px] text-slate-500 font-mono">Job: {item.job_id.slice(0, 10)}...</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                      item.status === 'done'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'processing'
                        ? 'bg-indigo-100 text-indigo-800 animate-pulse'
                        : item.status === 'unavailable'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.status === 'done' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {item.status === 'processing' && <Clock className="w-3.5 h-3.5 animate-spin" />}
                    {item.status === 'unavailable' && <AlertCircle className="w-3.5 h-3.5" />}
                    {item.status}
                  </span>

                  {item.generated_image_url && (
                    <a
                      href={item.generated_image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 border border-slate-200 hover:border-slate-300 rounded-lg text-slate-600 transition"
                      title="View Generated Image"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
