import { useState } from 'react';
import { 
  MagnifyingGlass, 
  ArrowsDownUp, 
  User, 
  ShieldCheck, 
  FileText, 
  FilePdf, 
  Clock, 
  CheckCircle, 
  XCircle, 
  PencilSimple, 
  Prohibit
} from '@phosphor-icons/react';
import { useAdminData, adminApiRequest, bytes, date, shortDate } from './adminData';
import { 
  LoadState, 
  EmptyState, 
  AdminBadge, 
  AdminPagination, 
  AdminDrawer, 
  AdminModal 
} from './AdminUI';

export default function UsersSection({ user, revision, onRefresh }) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Selected user for inspection drawer
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [drawerTab, setDrawerTab] = useState('profile'); // 'profile' | 'documents' | 'activity' | 'storage'

  // Edit Name Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // Status Toggle Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState('disabled');
  const [statusReason, setStatusReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Feedback banner
  const [actionFeedback, setActionFeedback] = useState({ type: '', message: '' });

  // Query string for list
  const queryParams = new URLSearchParams({
    page: String(page),
    limit: '15',
    sortBy,
    sortOrder,
    ...(search ? { q: search } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(roleFilter ? { role: roleFilter } : {}),
  });

  const state = useAdminData(`/api/admin/users?${queryParams.toString()}`, user, revision);
  const userDetails = useAdminData(
    selectedUserId ? `/api/admin/users/${selectedUserId}` : null,
    user,
    revision
  );

  const handleOpenUser = (u) => {
    setSelectedUserId(u._id);
    setDrawerTab('profile');
    setActionFeedback({ type: '', message: '' });
  };

  const handleOpenEditName = (u) => {
    setEditName(u.name || '');
    setIsEditModalOpen(true);
  };

  const handleSaveName = async () => {
    if (!selectedUserId || !editName.trim()) return;
    setIsUpdatingName(true);
    try {
      await adminApiRequest(`/api/admin/users/${selectedUserId}`, user, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName.trim() }),
      });
      setIsEditModalOpen(false);
      setActionFeedback({ type: 'success', message: 'User display name updated successfully.' });
      onRefresh?.();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleOpenStatusModal = (target) => {
    setTargetStatus(target);
    setStatusReason('');
    setIsStatusModalOpen(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedUserId) return;
    setIsUpdatingStatus(true);
    try {
      const res = await adminApiRequest(`/api/admin/users/${selectedUserId}/status`, user, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus, reason: statusReason }),
      });
      setIsStatusModalOpen(false);
      setActionFeedback({ type: 'success', message: res.message });
      onRefresh?.();
    } catch (err) {
      setActionFeedback({ type: 'error', message: err.message });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const isOwner = userDetails.data?.user?.email?.toLowerCase() === 'abishekvh@gmail.com';

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
              placeholder="Search users by name or email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 pl-10 pr-3.5 py-2 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 py-2 px-3 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors font-medium"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Accounts</option>
            <option value="disabled">Disabled Accounts</option>
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-50 border border-slate-200 text-xs text-slate-700 py-2 px-3 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white transition-colors font-medium"
          >
            <option value="">All Roles</option>
            <option value="admin">Administrators</option>
            <option value="user">Standard Users</option>
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
            <option value="createdAt">Joined Date</option>
            <option value="name">Name</option>
            <option value="storageUsed">Storage Used</option>
            <option value="lastLoginAt">Last Active</option>
          </select>
          <button
            type="button"
            onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
            className="p-2 bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title={`Sort Order: ${sortOrder.toUpperCase()}`}
          >
            <ArrowsDownUp size={14} weight="bold" />
          </button>
        </div>
      </div>

      {/* ── Status Counts Ribbon ─────────────────────────────────────── */}
      {state.data?.stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 text-xs">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-slate-500 font-semibold uppercase tracking-wider text-[11px]">Total Registered</span>
            <p className="text-xl font-bold text-slate-900 font-mono mt-1">
              {state.data.stats.totalUsers}
            </p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-emerald-700 font-semibold uppercase tracking-wider text-[11px]">Active Accounts</span>
            <p className="text-xl font-bold text-emerald-700 font-mono mt-1">
              {state.data.stats.activeUsers}
            </p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-rose-700 font-semibold uppercase tracking-wider text-[11px]">Disabled Accounts</span>
            <p className="text-xl font-bold text-rose-700 font-mono mt-1">
              {state.data.stats.disabledUsers}
            </p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-blue-700 font-semibold uppercase tracking-wider text-[11px]">Filter Matches</span>
            <p className="text-xl font-bold text-blue-700 font-mono mt-1">
              {state.data.total}
            </p>
          </div>
        </div>
      )}

      {/* Loading & Errors */}
      <LoadState state={state} text="Loading user directory…" />

      {/* ── Users Data Table ─────────────────────────────────────────── */}
      {state.data && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          {!state.data.users.length ? (
            <EmptyState
              title="No users match your criteria"
              message="Try adjusting your search terms or status filters."
              icon={User}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                    <th className="py-3.5 px-5">User</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Stored Docs</th>
                    <th className="py-3.5 px-4 text-right">Storage</th>
                    <th className="py-3.5 px-4">Joined</th>
                    <th className="py-3.5 px-4">Last Active</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {state.data.users.map((u) => {
                    const isOwnerRow = u.email?.toLowerCase() === 'abishekvh@gmail.com';
                    return (
                      <tr
                        key={u._id}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => handleOpenUser(u)}
                      >
                        {/* User Identity */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="relative shrink-0">
                              {u.profilePicture ? (
                                <img
                                  src={u.profilePicture}
                                  alt={u.name}
                                  className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-xs"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold font-mono">
                                  {u.name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || 'U'}
                                </div>
                              )}
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                  u.status === 'disabled' ? 'bg-rose-500' : 'bg-emerald-500'
                                }`}
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                <span>{u.name}</span>
                                {isOwnerRow && (
                                  <span title="Primary Owner Administrator">
                                    <ShieldCheck
                                      size={15}
                                      weight="fill"
                                      className="text-amber-500 shrink-0"
                                    />
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 font-mono truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3.5 px-4">
                          <AdminBadge variant={isOwnerRow ? 'admin' : u.role === 'admin' ? 'admin' : 'user'}>
                            {isOwnerRow ? 'Owner' : u.role}
                          </AdminBadge>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <AdminBadge variant={u.status === 'disabled' ? 'disabled' : 'active'}>
                            {u.status}
                          </AdminBadge>
                        </td>

                        {/* Documents Count */}
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800">
                          {u.documentCount}
                        </td>

                        {/* Storage Used */}
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                          {bytes(u.actualStorageBytes || u.storageUsed)}
                        </td>

                        {/* Joined Date */}
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-medium">
                          {shortDate(u.createdAt)}
                        </td>

                        {/* Last Active */}
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-medium">
                          {u.lastLoginAt ? shortDate(u.lastLoginAt) : u.lastUploadDate ? shortDate(u.lastUploadDate) : '—'}
                        </td>

                        {/* Quick Inspect Button */}
                        <td className="py-3.5 px-5 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenUser(u);
                            }}
                            className="px-3 py-1.5 text-xs rounded-xl bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-700 transition-all font-semibold border border-slate-200 shadow-xs cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
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

      {/* ── User Profile Inspector Slide-over Drawer ────────────────── */}
      <AdminDrawer
        isOpen={!!selectedUserId}
        onClose={() => setSelectedUserId(null)}
        title={userDetails.data?.user?.name || 'User Profile Inspector'}
        subtitle={userDetails.data?.user?.email}
        icon={User}
        maxWidth="max-w-3xl"
      >
        <LoadState state={userDetails} text="Loading profile telemetry…" />

        {actionFeedback.message && (
          <div
            className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 shadow-xs ${
              actionFeedback.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-700'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}
          >
            {actionFeedback.type === 'error' ? (
              <XCircle size={18} weight="bold" />
            ) : (
              <CheckCircle size={18} weight="bold" />
            )}
            <span className="font-medium">{actionFeedback.message}</span>
          </div>
        )}

        {userDetails.data && (
          <div className="space-y-6">
            {/* Quick Overview Hero Panel */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-4">
                <div className="relative">
                  {userDetails.data.user.profilePicture ? (
                    <img
                      src={userDetails.data.user.profilePicture}
                      alt={userDetails.data.user.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm font-bold font-mono text-lg">
                      {userDetails.data.user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <span
                    className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${
                      userDetails.data.user.status === 'disabled'
                        ? 'bg-rose-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-lg font-bold text-slate-900">
                      {userDetails.data.user.name}
                    </h4>
                    <button
                      type="button"
                      onClick={() => handleOpenEditName(userDetails.data.user)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                      title="Edit display name"
                    >
                      <PencilSimple size={14} weight="bold" />
                    </button>
                    {isOwner && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <ShieldCheck size={12} weight="fill" />
                        <span>Owner Account</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    {userDetails.data.user.email}
                  </p>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-2.5">
                <AdminBadge
                  variant={
                    userDetails.data.user.status === 'disabled' ? 'disabled' : 'active'
                  }
                  size="md"
                >
                  {userDetails.data.user.status}
                </AdminBadge>

                {isOwner ? (
                  <span
                    className="text-xs text-slate-400 italic px-2 py-1 font-medium"
                    title="Protected from modification"
                  >
                    Protected
                  </span>
                ) : userDetails.data.user.status === 'disabled' ? (
                  <button
                    type="button"
                    onClick={() => handleOpenStatusModal('active')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <CheckCircle size={15} weight="bold" />
                    <span>Reactivate</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenStatusModal('disabled')}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Prohibit size={15} weight="bold" />
                    <span>Disable Account</span>
                  </button>
                )}
              </div>
            </div>

            {/* Drawer Tab Navigation */}
            <div className="flex border-b border-slate-200 text-xs gap-2 font-medium">
              {[
                ['profile', 'Account Info'],
                ['documents', `Documents (${userDetails.data.storage.totalDocs})`],
                ['activity', 'Activity Trail'],
                ['storage', 'Storage & Formats'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setDrawerTab(id)}
                  className={`px-4 py-2.5 border-b-2 transition-all cursor-pointer ${
                    drawerTab === id
                      ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50 rounded-t-xl'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* TAB 1: Profile & Security Info */}
            {drawerTab === 'profile' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-slate-500 font-medium uppercase text-[10px] tracking-wider">Firebase UID</span>
                    <p className="font-mono text-slate-800 mt-1 break-all select-all font-semibold">
                      {userDetails.data.user.firebaseUid || '—'}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-slate-500 font-medium uppercase text-[10px] tracking-wider">MongoDB ID</span>
                    <p className="font-mono text-slate-800 mt-1 break-all select-all font-semibold">
                      {userDetails.data.user._id}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-slate-500 font-medium uppercase text-[10px] tracking-wider">Registration Date</span>
                    <p className="text-slate-800 mt-1 font-semibold">
                      {date(userDetails.data.user.createdAt)}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-slate-500 font-medium uppercase text-[10px] tracking-wider">Last Activity</span>
                    <p className="text-slate-800 mt-1 font-semibold">
                      {date(userDetails.data.user.lastLoginAt || userDetails.data.storage.lastUpload)}
                    </p>
                  </div>
                </div>

                {/* Account Status Diagnostics */}
                {userDetails.data.user.status === 'disabled' && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700">
                    <span className="font-bold flex items-center gap-1.5 text-xs text-rose-800">
                      <Prohibit size={16} weight="bold" />
                      <span>Account Disabled</span>
                    </span>
                    <p className="mt-1 text-xs text-slate-700">
                      Reason:{' '}
                      <span className="font-semibold text-slate-900">
                        {userDetails.data.user.disabledReason || 'Administrative decision'}
                      </span>
                    </p>
                    {userDetails.data.user.disabledAt && (
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Disabled on: {date(userDetails.data.user.disabledAt)}
                      </p>
                    )}
                  </div>
                )}

                {/* Storage Meter */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">Storage Quota Consumption</span>
                    <span className="font-mono font-bold text-slate-900">
                      {bytes(userDetails.data.storage.totalBytes)} / 500 MB (524.3 MB limit)
                    </span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (userDetails.data.storage.totalBytes / (500 * 1024 * 1024)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* ML Classification Summary for this User */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h5 className="font-bold text-slate-900 text-xs">User ML Classification Telemetry</h5>
                  <div className="grid grid-cols-3 gap-3 text-center font-mono">
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[10px] text-slate-500 font-sans block font-semibold uppercase">Total Inferences</span>
                      <span className="text-base font-bold text-slate-900 mt-1 block">
                        {userDetails.data.mlSummary.total}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[10px] text-emerald-700 font-sans block font-semibold uppercase">ML Accepted</span>
                      <span className="text-base font-bold text-emerald-700 mt-1 block">
                        {userDetails.data.mlSummary.accepted}
                      </span>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                      <span className="text-[10px] text-blue-700 font-sans block font-semibold uppercase">Agreement Rate</span>
                      <span className="text-base font-bold text-blue-700 mt-1 block">
                        {userDetails.data.mlSummary.acceptanceRate !== null
                          ? `${(userDetails.data.mlSummary.acceptanceRate * 100).toFixed(1)}%`
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: User Documents */}
            {drawerTab === 'documents' && (
              <div className="space-y-3">
                {!userDetails.data.recentDocuments.length ? (
                  <EmptyState
                    title="No stored documents"
                    message="This user has not uploaded any documents into Arckiv yet."
                    icon={FileText}
                  />
                ) : (
                  <div className="space-y-2.5">
                    {userDetails.data.recentDocuments.map((d) => (
                      <div
                        key={d._id}
                        className="p-3.5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors flex items-center justify-between gap-3 text-xs shadow-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 shrink-0">
                            {d.type?.includes('pdf') ? (
                              <FilePdf size={18} className="text-rose-600" weight="duotone" />
                            ) : (
                              <FileText size={18} className="text-blue-600" weight="duotone" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-semibold text-slate-900 truncate">{d.name}</h5>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 font-mono">
                              <span>{bytes(d.size)}</span>
                              <span>•</span>
                              <span>{shortDate(d.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <AdminBadge variant={d.classification?.source || 'default'}>
                            {d.category || 'Uncategorized'}
                          </AdminBadge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Activity Trail */}
            {drawerTab === 'activity' && (
              <div className="space-y-3">
                {!userDetails.data.recentActivity.length ? (
                  <EmptyState
                    title="No recorded lifecycle events"
                    message="Activity will appear here when this user uploads, edits, or deletes documents."
                    icon={Clock}
                  />
                ) : (
                  <div className="relative pl-5 border-l-2 border-slate-200 space-y-4 text-xs">
                    {userDetails.data.recentActivity.map((evt) => (
                      <div key={evt._id} className="relative group">
                        <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white" />
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-slate-900 text-xs">
                            {evt.action}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            {date(evt.createdAt)}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-0.5 truncate font-medium">
                          Target: <span className="text-slate-900 font-semibold">{evt.documentName || 'Document'}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: Storage Breakdown */}
            {drawerTab === 'storage' && (
              <div className="space-y-4 text-xs">
                {/* MIME Distribution */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h5 className="font-bold text-slate-900 text-xs">Storage by Format</h5>
                  <div className="space-y-2.5">
                    {userDetails.data.storage.types.map((t) => (
                      <div key={t.label} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-800 font-medium">{t.label}</span>
                          <span className="font-mono text-slate-500 font-semibold">
                            {t.count} files • {bytes(t.bytes)}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                userDetails.data.storage.totalBytes
                                  ? (t.bytes / userDetails.data.storage.totalBytes) * 100
                                  : 0
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Category Distribution */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <h5 className="font-bold text-slate-900 text-xs">Storage by Category</h5>
                  <div className="space-y-2.5">
                    {userDetails.data.storage.categories.map((c) => (
                      <div key={c.label} className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-800 font-medium">{c.label}</span>
                          <span className="font-mono text-slate-500 font-semibold">
                            {c.count} files • {bytes(c.bytes)}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-600 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                userDetails.data.storage.totalBytes
                                  ? (c.bytes / userDetails.data.storage.totalBytes) * 100
                                  : 0
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </AdminDrawer>

      {/* Edit Display Name Modal */}
      <AdminModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onConfirm={handleSaveName}
        title="Edit User Profile"
        description="Update the permitted profile display name for this user. Email changes must follow Firebase authentication workflows."
        confirmText="Save Name"
        loading={isUpdatingName}
      >
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">Display Name</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="User full name"
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-3 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
          />
        </div>
      </AdminModal>

      {/* Account Disable/Enable Confirmation Modal */}
      <AdminModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onConfirm={handleConfirmStatusChange}
        title={targetStatus === 'disabled' ? 'Disable User Account' : 'Reactivate User Account'}
        description={
          targetStatus === 'disabled'
            ? 'Disabling this account immediately revokes the user’s ability to upload, modify, or sync documents. Existing document metadata remains preserved for administrative audit.'
            : 'Reactivating this account restores the user’s ability to authenticate and access their documents.'
        }
        confirmText={targetStatus === 'disabled' ? 'Disable Account' : 'Reactivate Account'}
        isDestructive={targetStatus === 'disabled'}
        loading={isUpdatingStatus}
      >
        {targetStatus === 'disabled' && (
          <div className="space-y-2 mt-3">
            <label className="text-xs font-semibold text-slate-700">
              Reason for Disabling (Required for Audit Log)
            </label>
            <textarea
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="e.g., Storage quota abuse, policy violation, or user request"
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 p-3 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white font-medium"
            />
          </div>
        )}
      </AdminModal>
    </div>
  );
}
