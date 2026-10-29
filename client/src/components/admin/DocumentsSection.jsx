import { useState } from 'react';
import { 
  MagnifyingGlass, 
  ArrowsDownUp, 
  FileText, 
  FilePdf, 
  FileImage,
  Sparkle, 
  Cpu, 
  LockKey, 
  ShieldCheck, 
  ArrowSquareOut
} from '@phosphor-icons/react';
import { useAdminData, bytes, shortDate, date, pct } from './adminData';
import { 
  LoadState, 
  EmptyState, 
  AdminBadge, 
  AdminPagination, 
  AdminDrawer,
  ConfidenceMeter 
} from './AdminUI';

export default function DocumentsSection({ user, revision, onJumpToInference }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Selected document for inspection drawer
  const [selectedDocId, setSelectedDocId] = useState(null);

  const queryParams = new URLSearchParams({
    page: String(page),
    limit: '15',
    sortBy,
    sortOrder,
    ...(search ? { q: search } : {}),
    ...(categoryFilter ? { category: categoryFilter } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
    ...(sourceFilter ? { source: sourceFilter } : {}),
  });

  const state = useAdminData(`/api/admin/documents?${queryParams.toString()}`, user, revision);
  const docDetails = useAdminData(
    selectedDocId ? `/api/admin/documents/${selectedDocId}` : null,
    user,
    revision
  );

  const getFormatIcon = (type = '') => {
    if (type.includes('pdf')) return <FilePdf size={18} className="text-rose-600" weight="duotone" />;
    if (type.startsWith('image/')) return <FileImage size={18} className="text-purple-600" weight="duotone" />;
    return <FileText size={18} className="text-blue-600" weight="duotone" />;
  };

  return (
    <div className="space-y-5">
      {/* ── Search and Filters Bar ───────────────────────────────────── */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <MagnifyingGlass
              size={16}
              weight="bold"
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Search global documents by title, category, or tags…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 pl-10 pr-3.5 py-2 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 py-2 px-3 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors font-medium"
          >
            <option value="">All Categories</option>
            <option value="Invoice">Invoice</option>
            <option value="Receipt">Receipt</option>
            <option value="Certificate">Certificate</option>
            <option value="Report">Report</option>
            <option value="Identity">Identity</option>
            <option value="Uncategorized">Uncategorized</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 py-2 px-3 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors font-medium"
          >
            <option value="">All Formats</option>
            <option value="pdf">PDF Documents</option>
            <option value="image">Images (PNG/JPEG)</option>
            <option value="docx">Word (DOCX)</option>
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 py-2 px-3 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors font-medium"
          >
            <option value="">All Classifier Sources</option>
            <option value="ml">Machine Learning (Accepted)</option>
            <option value="gemini">Gemini Analysis (Retained)</option>
            <option value="default">Default / Unverified</option>
            <option value="manual">Manual Override</option>
          </select>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium hidden sm:inline">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 py-1.5 px-3 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
          >
            <option value="createdAt">Upload Date</option>
            <option value="name">Filename</option>
            <option value="size">File Size</option>
            <option value="category">Category</option>
          </select>
          <button
            type="button"
            onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            className="p-2 bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title={`Order: ${sortOrder.toUpperCase()}`}
          >
            <ArrowsDownUp size={14} weight="bold" />
          </button>
        </div>
      </div>

      {/* ── Global Vault Stats ───────────────────────────────────────── */}
      {state.data?.globalStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Vault Inventory</span>
            <p className="text-xl font-bold text-slate-900 font-mono mt-1">
              {state.data.globalStats.totalCount}
            </p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-blue-700 font-semibold uppercase tracking-wider text-[11px]">Aggregated Size</span>
            <p className="text-xl font-bold text-blue-700 font-mono mt-1">
              {bytes(state.data.globalStats.totalBytes)}
            </p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-purple-700 font-semibold uppercase tracking-wider text-[11px]">Matching Filters</span>
            <p className="text-xl font-bold text-purple-700 font-mono mt-1">
              {state.data.total}
            </p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-emerald-700 font-semibold uppercase tracking-wider text-[11px]">Privacy Protection</span>
            <p className="text-xs font-semibold text-emerald-700 mt-1.5 flex items-center gap-1.5">
              <ShieldCheck size={16} weight="fill" />
              <span>Restricted Decryption</span>
            </p>
          </div>
        </div>
      )}

      {/* Loading & Errors */}
      <LoadState state={state} text="Loading global documents…" />

      {/* ── Documents Data Table ─────────────────────────────────────── */}
      {state.data && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          {!state.data.documents.length ? (
            <EmptyState
              title="No documents match your query"
              message="Try broadening your search terms or clearing active category and format filters."
              icon={FileText}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-5">Document</th>
                    <th className="py-3.5 px-4">Owner</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Classification Source</th>
                    <th className="py-3.5 px-4 text-right">Size</th>
                    <th className="py-3.5 px-4">Uploaded</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {state.data.documents.map((d) => (
                    <tr
                      key={d._id}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={() => setSelectedDocId(d._id)}
                    >
                      {/* Document Details */}
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-50 rounded-xl text-slate-600 shrink-0 border border-slate-200 shadow-xs">
                            {getFormatIcon(d.type)}
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate max-w-xs sm:max-w-md">
                              {d.name}
                            </h5>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                              <span>{d.type?.split('/')[1]?.toUpperCase() || 'FILE'}</span>
                              {d.tags?.length > 0 && (
                                <>
                                  <span>•</span>
                                  <span className="truncate max-w-[180px]">{d.tags.join(', ')}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Owner */}
                      <td className="py-3.5 px-4">
                        {d.owner ? (
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-800 block truncate">
                              {d.owner.name}
                            </span>
                            <span className="text-[11px] text-slate-500 font-mono block truncate">
                              {d.owner.email}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unknown</span>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                          {d.category || 'Uncategorized'}
                        </span>
                      </td>

                      {/* Classification Source & Confidence */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <AdminBadge variant={d.classification?.source || 'default'}>
                            {d.classification?.source || 'unclassified'}
                          </AdminBadge>
                          {typeof d.classification?.confidence === 'number' && (
                            <span className="font-mono text-[11px] text-slate-600 font-semibold">
                              {pct(d.classification.confidence)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* File Size */}
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-800">
                        {bytes(d.size)}
                      </td>

                      {/* Upload Date */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-medium">
                        {shortDate(d.createdAt)}
                      </td>

                      {/* Inspect Button */}
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDocId(d._id);
                          }}
                          className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-700 transition-all font-semibold border border-slate-200 shadow-xs cursor-pointer"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="p-4 bg-slate-50/50 border-t border-slate-200">
            <AdminPagination
              page={page}
              pages={state.data.pages}
              total={state.data.total}
              limit={state.data.limit}
              onPage={setPage}
            />
          </div>
        </div>
      )}

      {/* ── Document Inspector Drawer ─────────────────────────────────── */}
      <AdminDrawer
        isOpen={!!selectedDocId}
        onClose={() => setSelectedDocId(null)}
        title={docDetails.data?.document?.name || 'Document Inspector'}
        subtitle={docDetails.data?.document?.type}
        icon={FileText}
        maxWidth="max-w-3xl"
      >
        <LoadState state={docDetails} text="Loading document metadata…" />

        {docDetails.data && (
          <div className="space-y-6">
            {/* Security Notice Banner */}
            <div className="p-4.5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3.5 text-xs shadow-xs">
              <LockKey size={22} weight="duotone" className="shrink-0 text-amber-700 mt-0.5" />
              <div>
                <h5 className="font-bold text-amber-900 text-xs">End-User Encryption & Privacy Restriction</h5>
                <p className="text-amber-800 mt-1 leading-relaxed">
                  {docDetails.data.securityNotice}
                </p>
              </div>
            </div>

            {/* Document Metadata Grid */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5 text-xs">
              <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">File Identity & Attributes</h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 pt-1">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">File Size</span>
                  <p className="font-mono text-slate-900 mt-1 font-bold text-sm">
                    {bytes(docDetails.data.document.size)}
                  </p>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">MIME Type</span>
                  <p className="font-mono text-slate-900 mt-1 truncate font-semibold text-xs">
                    {docDetails.data.document.type}
                  </p>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">Upload Date</span>
                  <p className="text-slate-900 mt-1 font-semibold text-xs">
                    {shortDate(docDetails.data.document.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Owner Details */}
            {docDetails.data.document.owner && (
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
                <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Owner Identity</h5>
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0 font-bold font-mono text-sm shadow-xs">
                    {docDetails.data.document.owner.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-sm">
                      {docDetails.data.document.owner.name}
                    </h5>
                    <p className="text-slate-500 font-mono mt-0.5 text-xs">
                      {docDetails.data.document.owner.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Classification & ML Decision Card */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Cpu size={16} weight="duotone" className="text-blue-600" />
                  <span>Pipeline Classification Outcome</span>
                </h5>
                <AdminBadge variant={docDetails.data.document.classification?.source || 'default'}>
                  {docDetails.data.document.classification?.source || 'unclassified'}
                </AdminBadge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">Assigned Category</span>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {docDetails.data.document.category}
                  </p>
                </div>
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">Confidence Gate (0.45 Threshold)</span>
                  <div className="mt-2">
                    <ConfidenceMeter
                      value={docDetails.data.document.classification?.confidence}
                      threshold={docDetails.data.document.classification?.threshold || 0.45}
                    />
                  </div>
                </div>
              </div>

              {/* Direct Jump Link to ML Studio */}
              {docDetails.data.inference ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDocId(null);
                      onJumpToInference?.(docDetails.data.inference._id);
                    }}
                    className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Sparkle size={16} weight="fill" />
                    <span>Open in ML Intelligence Studio (Inspect 11-Stage Timeline)</span>
                    <ArrowSquareOut size={15} weight="bold" />
                  </button>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 text-center text-xs">
                  No historical inference trace recorded for this pre-migration document.
                </div>
              )}
            </div>

            {/* Lifecycle History Events */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3.5 text-xs">
              <h5 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Document Lifecycle Events</h5>
              {!docDetails.data.history?.length ? (
                <p className="text-slate-400 py-2">No historical events recorded for this document.</p>
              ) : (
                <div className="relative pl-5 border-l-2 border-slate-200 space-y-3">
                  {docDetails.data.history.map((evt) => (
                    <div key={evt._id} className="relative">
                      <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{evt.action}</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {date(evt.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </AdminDrawer>
    </div>
  );
}
