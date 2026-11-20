import { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { apiRequest } from '../../services/api';
import type { ContactMessage, User } from '../../types';

export function AdminCustomersPanel() {
  const { user, pushToast } = useApp();
  const [customers, setCustomers] = useState<(User & { orderCount: number; bookingCount: number })[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [search, setSearch] = useState('');

  // Staff provisioning form (Super Admin only)
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<'staff' | 'manager'>('staff');

  const loadCustomers = async () => {
    const res = await apiRequest<{ customers: any[] }>(`/api/admin/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`);
    setCustomers(res.customers);
    if (user?.role === 'super_admin') {
      const sRes = await apiRequest<{ staff: User[] }>('/api/admin/staff');
      setStaff(sRes.staff);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const toggleStatus = async (c: User) => {
    try {
      const nextStatus = c.accountStatus === 'active' ? 'suspended' : 'active';
      await apiRequest(`/api/admin/customers/${c.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ accountStatus: nextStatus }),
      });
      pushToast('success', `Customer ${c.fullName} marked ${nextStatus}.`);
      loadCustomers();
    } catch (err: any) {
      pushToast('error', err.message || 'Action denied.');
    }
  };

  const handleProvisionStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify({ fullName: staffName, email: staffEmail, password: staffPassword, role: staffRole }),
      });
      setStaffName('');
      setStaffEmail('');
      setStaffPassword('');
      pushToast('success', 'Staff member provisioned.');
      loadCustomers();
    } catch (err: any) {
      pushToast('error', err.message || 'Could not provision staff account.');
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-[#292722]">Customers &amp; Access Roles</h2>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or email..."
            className="bg-white border border-[#E5DED3] px-3 py-2 text-sm"
          />
          <button type="button" onClick={loadCustomers} className="px-4 py-2 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-wider cursor-pointer">
            Search
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E5DED3] overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E5DED3] bg-[#F8F6F1] text-[11px] uppercase tracking-[0.16em] text-[#81796D]">
            <tr>
              <th className="py-3 px-4">Guest</th>
              <th className="py-3 px-4">Phone</th>
              <th className="py-3 px-4">Orders</th>
              <th className="py-3 px-4">Workshops</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5DED3]">
            {customers.length === 0 ? (
              <tr><td colSpan={6} className="py-8 text-center text-[#81796D]">No registered customer accounts yet.</td></tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id}>
                  <td className="py-3 px-4">
                    <p className="font-medium text-[#292722]">{c.fullName}</p>
                    <p className="text-xs text-[#81796D]">{c.email}</p>
                  </td>
                  <td className="py-3 px-4 tabular-nums text-[#81796D]">{c.phone || '—'}</td>
                  <td className="py-3 px-4 tabular-nums">{c.orderCount}</td>
                  <td className="py-3 px-4 tabular-nums">{c.bookingCount}</td>
                  <td className="py-3 px-4 text-xs capitalize text-[#69462D]">{c.accountStatus}</td>
                  <td className="py-3 px-4 text-right">
                    {['super_admin', 'manager'].includes(user?.role || '') && (
                      <button
                        type="button"
                        onClick={() => toggleStatus(c)}
                        className="text-xs uppercase tracking-wider text-[#8A6548] hover:underline cursor-pointer"
                      >
                        {c.accountStatus === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {user?.role === 'super_admin' && (
        <div className="bg-white border border-[#E5DED3] p-6 space-y-5">
          <h3 className="font-serif text-2xl text-[#292722]">Staff &amp; Manager Provisioning (Super Admin)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {staff.map((s) => (
              <div key={s.id} className="border border-[#E5DED3] bg-[#F8F6F1] p-4 text-xs">
                <p className="font-medium text-[#292722] text-sm">{s.fullName}</p>
                <p className="text-[#81796D]">{s.email}</p>
                <p className="uppercase tracking-wider text-[#69462D] mt-1">{s.role.replace('_', ' ')}</p>
              </div>
            ))}
          </div>
          <form onSubmit={handleProvisionStaff} className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-3 border-t border-[#E5DED3]">
            <input placeholder="Full name" value={staffName} onChange={(e) => setStaffName(e.target.value)} required className="border border-[#E5DED3] px-3 py-2 text-sm" />
            <input type="email" placeholder="Staff email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} required className="border border-[#E5DED3] px-3 py-2 text-sm" />
            <input type="password" placeholder="Password (min 10 chars)" minLength={10} value={staffPassword} onChange={(e) => setStaffPassword(e.target.value)} required className="border border-[#E5DED3] px-3 py-2 text-sm" />
            <select value={staffRole} onChange={(e) => setStaffRole(e.target.value as any)} className="border border-[#E5DED3] px-3 py-2 text-sm bg-white">
              <option value="staff">Staff</option>
              <option value="manager">Manager</option>
            </select>
            <button type="submit" className="px-4 py-2 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.14em] cursor-pointer">
              Provision Staff
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export function AdminCmsPanel() {
  const { cmsSections, refreshContent, pushToast } = useApp();
  const sectionIds = Object.keys(cmsSections);
  const [selectedId, setSelectedId] = useState(sectionIds[0] || 'hero');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentJson, setContentJson] = useState('{}');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const s = cmsSections[selectedId];
    if (s) {
      setTitle(s.title);
      setSubtitle(s.subtitle || '');
      setDescription(s.description || '');
      setContentJson(JSON.stringify(s.content || {}, null, 2));
    }
  }, [selectedId, cmsSections]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsedContent = {};
    try {
      parsedContent = JSON.parse(contentJson);
    } catch {
      pushToast('error', 'Structured JSON content is invalid.');
      return;
    }

    try {
      setSaving(true);
      await apiRequest(`/api/content/${selectedId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, subtitle, description, content: parsedContent }),
      });
      await refreshContent();
      pushToast('success', `Section "${selectedId}" updated across the live website.`);
    } catch (err: any) {
      pushToast('error', err.message || 'Could not update section.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-3xl text-[#292722]">Website Content Management (CMS)</h2>
        <p className="text-sm text-[#81796D] mt-1">
          Edits saved here persist in the database and update the public homepage, timeline, artisan profiles, and footer immediately.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {sectionIds.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setSelectedId(id)}
            className={`px-4 py-2 text-xs uppercase tracking-[0.14em] border cursor-pointer ${
              selectedId === id ? 'bg-[#292722] text-[#F8F6F1] border-[#292722]' : 'bg-white text-[#81796D] border-[#E5DED3]'
            }`}
          >
            {id.replace('_', ' ')}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="bg-white border border-[#E5DED3] p-6 sm:p-8 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Section Eyebrow / Subtitle</label>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="w-full border border-[#E5DED3] px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Primary Heading / Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full border border-[#E5DED3] px-3.5 py-2.5 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Editorial Description</label>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border border-[#E5DED3] px-3.5 py-2.5 text-sm" />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">
            Section Structured Items (Milestones, Artisan Profiles, Info Cards, Principles)
          </label>
          <textarea
            rows={12}
            value={contentJson}
            onChange={(e) => setContentJson(e.target.value)}
            className="w-full border border-[#E5DED3] px-3.5 py-2.5 text-xs font-mono bg-[#F8F6F1]"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-7 py-3 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.18em] hover:bg-[#69462D] cursor-pointer"
        >
          {saving ? 'Publishing...' : 'Save & Publish to Website'}
        </button>
      </form>
    </div>
  );
}

export function AdminEnquiriesPanel() {
  const { pushToast } = useApp();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const loadData = async () => {
    const [mRes, sRes, lRes] = await Promise.all([
      apiRequest<{ messages: ContactMessage[] }>('/api/admin/enquiries'),
      apiRequest<{ subscribers: any[] }>('/api/admin/subscribers').catch(() => ({ subscribers: [] })),
      apiRequest<{ logs: any[] }>('/api/admin/notifications').catch(() => ({ logs: [] })),
    ]);
    setMessages(mRes.messages);
    setSubscribers(sRes.subscribers);
    setLogs(lRes.logs);
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateEnquiryStatus = async (id: string, status: string) => {
    await apiRequest(`/api/admin/enquiries/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    pushToast('success', 'Enquiry status updated.');
    loadData();
  };

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <h2 className="font-serif text-3xl text-[#292722]">Contact Enquiries</h2>
        {messages.length === 0 ? (
          <div className="bg-white border border-[#E5DED3] p-8 text-sm text-[#81796D]">No customer enquiries received yet.</div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div key={m.id} className="bg-white border border-[#E5DED3] p-6 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-serif text-xl text-[#292722]">{m.subject}</p>
                    <p className="text-xs text-[#81796D]">
                      From {m.name} ({m.email}) · {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <select
                    value={m.status}
                    onChange={(e) => updateEnquiryStatus(m.id, e.target.value)}
                    className="border border-[#E5DED3] px-3 py-1.5 text-xs bg-white"
                  >
                    <option value="new">New</option>
                    <option value="in_review">In Review</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <p className="text-sm text-[#292722] leading-relaxed pt-2 border-t border-[#E5DED3]">{m.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E5DED3] p-6 space-y-4">
          <h3 className="font-serif text-2xl text-[#292722]">Newsletter Subscribers ({subscribers.length})</h3>
          {subscribers.length === 0 ? (
            <p className="text-sm text-[#81796D]">No newsletter subscribers yet.</p>
          ) : (
            <div className="divide-y divide-[#E5DED3] text-sm">
              {subscribers.map((s) => (
                <div key={s.id} className="py-2 flex justify-between">
                  <span>{s.email}</span>
                  <span className="text-xs text-[#81796D]">{new Date(s.subscribed_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-[#E5DED3] p-6 space-y-4">
          <h3 className="font-serif text-2xl text-[#292722]">Transactional Notification Log</h3>
          {logs.length === 0 ? (
            <p className="text-sm text-[#81796D]">No email events logged yet.</p>
          ) : (
            <div className="divide-y divide-[#E5DED3] text-xs max-h-64 overflow-y-auto">
              {logs.map((l) => (
                <div key={l.id} className="py-2 flex justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#292722]">{l.subject}</p>
                    <p className="text-[#81796D]">{l.recipient_email} · {l.type}</p>
                  </div>
                  <span className="uppercase tracking-wider text-[#69462D] shrink-0">{l.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
