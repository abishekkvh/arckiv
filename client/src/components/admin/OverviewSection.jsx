import { 
  Users, 
  Files, 
  HardDrive, 
  UploadSimple, 
  Cpu, 
  Sparkle, 
  ChartLine, 
  ChartBar, 
  ChartPie, 
  Clock,
  Pulse,
  CheckCircle,
  FileText,
  FileImage,
  ShareNetwork,
  Trash
} from '@phosphor-icons/react';
import { useAdminData, bytes, shortDate, pct } from './adminData';
import { 
  LoadState, 
  StatCard, 
  AdminBadge 
} from './AdminUI';

export default function OverviewSection({ user, revision }) {
  const state = useAdminData('/api/admin/analytics', user, revision);

  if (state.loading) return <LoadState state={state} text="Loading operational analytics…" />;
  if (state.error) return <LoadState state={state} />;
  if (!state.data) return null;

  const data = state.data;
  const totals = data.totals || {};
  const charts = data.charts || {};
  const health = data.health || {};

  // 30-Day Daily upload volume data
  const uploadPoints = data.uploads || [];
  const maxUploads = Math.max(1, ...uploadPoints.map((u) => u.count));

  // Confidence distribution buckets
  const confidenceBuckets = charts.confidence || [];
  const totalInferencesInBuckets = confidenceBuckets.reduce((acc, c) => acc + (c.count || 0), 0);
  const maxConfidenceCount = Math.max(1, ...confidenceBuckets.map((c) => c.count));

  const getActionIcon = (action = '') => {
    const act = action.toUpperCase();
    if (act.includes('UPLOAD') || act.includes('CREATE')) return UploadSimple;
    if (act.includes('DELETE')) return Trash;
    if (act.includes('SHARE')) return ShareNetwork;
    if (act.includes('REVIEW') || act.includes('EDIT')) return CheckCircle;
    return FileText;
  };

  return (
    <div className="space-y-6">
      {/* ── Operational Status Banner ─────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                health.ready ? 'bg-emerald-500 shadow-sm shadow-emerald-500/40 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="font-bold text-slate-900 text-xs sm:text-sm">
              {health.ready ? 'Production Classifier Operational' : 'Classifier Standby / Degraded'}
            </span>
          </div>
          <span className="text-slate-300">•</span>
          <span className="text-xs text-slate-600 font-mono">
            Model: <span className="text-blue-600 font-semibold">{health.modelId || 'arckiv-v2-logistic_regression'}</span>
          </span>
          <span className="text-slate-300 hidden md:inline">•</span>
          <span className="text-xs text-slate-500 font-mono hidden md:inline">
            Confidence Gate: <span className="text-slate-700 font-bold">{pct(health.threshold ?? 0.45)}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
          <span>Reporting Window: Last 30 Days (UTC)</span>
        </div>
      </div>

      {/* ── Executive KPI Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatCard
          title="Total Users"
          value={data.totalUsers}
          note={`${data.activeUsers ?? data.totalUsers} Active • ${data.disabledUsers ?? 0} Disabled`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Stored Documents"
          value={data.totalDocuments}
          note="Global vault inventory"
          icon={Files}
          color="indigo"
        />
        <StatCard
          title="Vault Storage"
          value={bytes(data.totalStorageBytes || 0)}
          note="Aggregated ciphertext"
          icon={HardDrive}
          color="purple"
        />
        <StatCard
          title="Today's Volume"
          value={data.todayUploads || 0}
          note="Ingested past 24h"
          icon={UploadSimple}
          color="emerald"
        />
        <StatCard
          title="ML Acceptance"
          value={totals.mlAttempts > 0 ? pct(totals.acceptanceRate) : '—'}
          note={totals.mlAttempts > 0 ? `${totals.accepted || 0} / ${totals.mlAttempts} runs` : 'No runs logged yet'}
          icon={Cpu}
          color="amber"
        />
        <StatCard
          title="Gemini Fallback"
          value={totals.records > 0 ? pct(totals.fallbackRate) : '—'}
          note={totals.records > 0 ? `${totals.fallbacks || 0} AI categories` : 'No fallbacks logged'}
          icon={Sparkle}
          color="rose"
        />
      </div>

      {/* ── Visual Charts Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Chart 1: 30-Day Upload Volume SVG Chart */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <ChartLine size={18} weight="duotone" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">30-Day Document Ingestion Volume</h4>
                <p className="text-xs text-slate-500">Daily document uploads recorded over the past 30 days</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              Peak: {maxUploads} docs/day
            </span>
          </div>

          {!uploadPoints.length ? (
            <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <p className="text-xs text-slate-500 font-medium">No document uploads recorded in the 30-day window.</p>
            </div>
          ) : (
            <div className="space-y-3 pt-3">
              <div className="h-36 flex items-end gap-1.5 w-full pt-4 border-b border-slate-200 pb-1">
                {uploadPoints.map((pt) => {
                  const heightPct = Math.max(6, (pt.count / maxUploads) * 100);
                  return (
                    <div
                      key={pt._id}
                      className="flex-1 flex flex-col items-center group relative h-full justify-end"
                    >
                      {/* Interactive Hover Tooltip */}
                      <div className="absolute -top-9 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-[11px] font-mono text-white px-2.5 py-1 rounded-lg shadow-lg pointer-events-none z-20 whitespace-nowrap">
                        {pt._id}: <span className="text-blue-400 font-bold">{pt.count} docs</span>
                      </div>
                      <div
                        className="w-full bg-blue-600 hover:bg-blue-500 rounded-t-sm transition-all cursor-pointer"
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>{uploadPoints[0]?._id}</span>
                <span>{uploadPoints[Math.floor(uploadPoints.length / 2)]?._id}</span>
                <span>{uploadPoints[uploadPoints.length - 1]?._id}</span>
              </div>
            </div>
          )}
        </div>

        {/* Chart 2: Model Confidence Distribution Histogram */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 border border-purple-100">
                <ChartBar size={18} weight="duotone" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Posterior Probability Distribution</h4>
                <p className="text-xs text-slate-500">Inference scores partitioned around the 0.45 safety gate</p>
              </div>
            </div>
            <span className="text-xs font-mono font-semibold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
              Gate: 0.45
            </span>
          </div>

          {totalInferencesInBuckets === 0 ? (
            <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <p className="text-xs text-slate-500 font-medium">
                No monitored ML inference logs recorded yet. Upload a document to view real-time confidence distributions.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pt-2 text-xs">
              {['0.0 - 0.2', '0.2 - 0.4', '0.4 - 0.6', '0.6 - 0.8', '0.8 - 1.0'].map((bracket, idx) => {
                const bucket = confidenceBuckets.find((b) => Math.floor(b._id * 5) === idx);
                const count = bucket ? bucket.count : 0;
                const isOverThreshold = idx >= 2; // >= 0.4 bracket
                const fillPct = maxConfidenceCount > 0 ? (count / maxConfidenceCount) * 100 : 0;
                return (
                  <div key={bracket} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-medium ${isOverThreshold ? 'text-slate-800' : 'text-slate-500'}`}>
                          {bracket}
                        </span>
                        {idx === 2 && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                            0.45 Gate Boundary
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-slate-600 font-semibold">{count} runs</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 border border-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isOverThreshold 
                            ? 'bg-gradient-to-r from-blue-600 to-emerald-500' 
                            : 'bg-slate-400'
                        }`}
                        style={{ width: `${Math.max(count > 0 ? 4 : 0, fillPct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Breakdowns & Lifecycle Activity Feed ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Formats & Classification Authority Distribution */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-6 text-xs">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ChartPie size={16} weight="duotone" className="text-emerald-600" />
              <h4 className="font-bold text-slate-900 text-sm">Vault Formats</h4>
            </div>
            {!(data.types || []).length ? (
              <p className="text-xs text-slate-400">No format statistics available.</p>
            ) : (
              <div className="space-y-2.5">
                {(data.types || []).map((t) => (
                  <div key={t._id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-2">
                      {t._id === 'PDF' && <FileText size={16} weight="duotone" className="text-rose-600" />}
                      {t._id === 'Image' && <FileImage size={16} weight="duotone" className="text-purple-600" />}
                      {t._id !== 'PDF' && t._id !== 'Image' && <Files size={16} weight="duotone" className="text-blue-600" />}
                      <span className="text-slate-800 font-semibold">{t._id}</span>
                    </div>
                    <span className="font-mono text-slate-600 font-bold">{t.count} files</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-900 text-sm mb-3">Authority Decision Sources</h4>
            {!(charts.sources || []).length ? (
              <p className="text-xs text-slate-400">No classification records logged yet.</p>
            ) : (
              <div className="space-y-2">
                {(charts.sources || []).map((s) => (
                  <div key={s._id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <AdminBadge variant={s._id}>{s._id}</AdminBadge>
                    <span className="font-mono text-slate-800 font-bold">{s.count} docs</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Real-time Lifecycle Activity Stream */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4 lg:col-span-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                <Pulse size={18} weight="duotone" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">System Lifecycle Activity Stream</h4>
                <p className="text-xs text-slate-500">Live immutable events from document and user workflows</p>
              </div>
            </div>
          </div>

          {!data.recentHistory?.length ? (
            <div className="py-12 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              <p className="text-xs text-slate-500 font-medium">No lifecycle events recorded yet in the database.</p>
            </div>
          ) : (
            <div className="space-y-2.5 pt-1 max-h-84 overflow-y-auto pr-1">
              {data.recentHistory.map((item) => {
                const ActionIcon = getActionIcon(item.action);
                return (
                  <div
                    key={item._id}
                    className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/90 flex items-center justify-between gap-3 hover:border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-600 flex items-center justify-center shrink-0 shadow-xs">
                        <ActionIcon size={16} weight="duotone" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-bold text-slate-900 text-xs">{item.action}</span>
                          <span className="text-xs text-slate-600 truncate font-medium">
                            {item.doc?.name || item.metadata?.filename || 'Document'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          Actor: <span className="font-medium text-slate-700">{item.user?.name || item.user?.email || 'User'}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-500 shrink-0">
                      <Clock size={12} weight="bold" />
                      <span>{shortDate(item.createdAt)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
