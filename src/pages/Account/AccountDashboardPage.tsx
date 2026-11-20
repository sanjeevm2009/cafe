import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { LogOut, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { apiRequest, formatEur } from '../../services/api';
import { SeoHead } from '../../components/common/SeoHead';
import type { Address, Booking, Order, User } from '../../types';

export function AccountDashboardPage() {
  const { user, authLoading, logout, setSessionUser, pushToast } = useApp();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'overview' | 'orders' | 'workshops' | 'profile'>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [newAddress, setNewAddress] = useState({ label: 'Home', street: '', city: 'Paris', postalCode: '75009', instructions: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const loadAccountRecords = async () => {
    try {
      setLoadingData(true);
      const [ordRes, bkRes] = await Promise.all([
        apiRequest<{ orders: Order[] }>('/api/orders'),
        apiRequest<{ bookings: Booking[] }>('/api/bookings'),
      ]);
      setOrders(ordRes.orders);
      setBookings(bkRes.bookings);
    } catch {
      // ignore
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phone || '');
      setAddresses(user.addresses || []);
      loadAccountRecords();
    }
  }, [user]);

  if (authLoading) {
    return <div className="max-w-6xl mx-auto px-4 py-20"><div className="h-64 bg-white border border-[#E5DED3] animate-pulse" /></div>;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: '/account' }} replace />;
  }

  const handleVerifyEmail = async () => {
    try {
      const res = await apiRequest<{ user: User }>('/api/auth/verify-email', { method: 'POST' });
      setSessionUser(res.user);
      pushToast('success', 'Email verification completed.');
    } catch (err: any) {
      pushToast('error', err.message || 'Verification failed.');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      const res = await apiRequest<{ user: User }>('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({ fullName, phone, addresses }),
      });
      setSessionUser(res.user);
      pushToast('success', 'Profile and delivery addresses saved.');
    } catch (err: any) {
      pushToast('error', err.message || 'Could not update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddAddress = () => {
    if (!newAddress.street.trim() || !newAddress.city.trim() || !newAddress.postalCode.trim()) {
      pushToast('error', 'Please fill street, city, and postal code.');
      return;
    }
    const created: Address = {
      id: `addr-${Date.now()}`,
      label: newAddress.label || 'Paris',
      street: newAddress.street.trim(),
      city: newAddress.city.trim(),
      postalCode: newAddress.postalCode.trim(),
      instructions: newAddress.instructions.trim(),
      isDefault: addresses.length === 0,
    };
    setAddresses((prev) => [...prev, created]);
    setNewAddress({ label: 'Home', street: '', city: 'Paris', postalCode: '75009', instructions: '' });
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      await apiRequest(`/api/bookings/${bookingId}/cancel`, { method: 'PUT' });
      pushToast('info', 'Workshop reservation cancelled and seats released.');
      loadAccountRecords();
    } catch (err: any) {
      pushToast('error', err.message || 'Could not cancel reservation.');
    }
  };

  return (
    <div className="bg-[#F8F6F1] py-12 lg:py-16 min-h-[75vh]">
      <SeoHead title="My Account – MAISON CRUMB" description="Manage your Maison Crumb orders, workshop bookings, and profile." />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#E5DED3]">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">Guest Account</p>
            <h1 className="font-serif text-4xl text-[#292722] mt-1">Bonjour, {user.fullName}</h1>
            <p className="text-sm text-[#81796D] mt-1">
              {user.email} · {user.emailVerified ? 'Verified Email' : 'Email Unverified'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!user.emailVerified && (
              <button
                type="button"
                onClick={handleVerifyEmail}
                className="px-4 py-2.5 border border-[#8A6548] text-xs uppercase tracking-[0.14em] text-[#69462D] hover:bg-white cursor-pointer"
              >
                Verify Email Now
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate('/');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#E5DED3] bg-white text-xs uppercase tracking-[0.14em] text-[#292722] hover:border-[#292722] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'overview', label: 'My Account' },
            { id: 'orders', label: `My Orders (${orders.length})` },
            { id: 'workshops', label: `My Workshops (${bookings.length})` },
            { id: 'profile', label: 'My Profile & Addresses' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id as any)}
              className={`px-5 py-2.5 text-xs uppercase tracking-[0.16em] border cursor-pointer transition-colors ${
                tab === t.id
                  ? 'bg-[#292722] text-[#F8F6F1] border-[#292722]'
                  : 'bg-white text-[#81796D] border-[#E5DED3] hover:text-[#292722]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-[#E5DED3] p-6 space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-[#81796D]">Profile Details</p>
              <p className="font-serif text-2xl text-[#292722]">{user.fullName}</p>
              <p className="text-sm text-[#81796D]">{user.email}</p>
              <p className="text-sm text-[#81796D] tabular-nums">{user.phone || 'No phone saved'}</p>
            </div>
            <div className="bg-white border border-[#E5DED3] p-6 space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-[#81796D]">Bakery Orders</p>
              <p className="font-serif text-3xl text-[#292722] tabular-nums">{orders.length}</p>
              <button type="button" onClick={() => setTab('orders')} className="text-xs uppercase tracking-[0.14em] text-[#8A6548] hover:underline cursor-pointer">
                View Order History &rarr;
              </button>
            </div>
            <div className="bg-white border border-[#E5DED3] p-6 space-y-2">
              <p className="text-xs uppercase tracking-[0.18em] text-[#81796D]">Workshop Reservations</p>
              <p className="font-serif text-3xl text-[#292722] tabular-nums">{bookings.length}</p>
              <button type="button" onClick={() => setTab('workshops')} className="text-xs uppercase tracking-[0.14em] text-[#8A6548] hover:underline cursor-pointer">
                Manage Bookings &rarr;
              </button>
            </div>
          </div>
        )}

        {tab === 'orders' && (
          <div className="space-y-4">
            {loadingData ? (
              <div className="h-40 bg-white border border-[#E5DED3] animate-pulse" />
            ) : orders.length === 0 ? (
              <div className="bg-white border border-[#E5DED3] p-12 text-center space-y-4">
                <p className="font-serif text-2xl text-[#292722]">No bakery orders yet</p>
                <Link to="/creations" className="inline-block px-6 py-3 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em]">
                  Browse Creations
                </Link>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-white border border-[#E5DED3] p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#E5DED3]">
                    <div>
                      <p className="font-serif text-2xl text-[#292722] tabular-nums">{order.orderNumber}</p>
                      <p className="text-xs text-[#81796D]">
                        Placed {new Date(order.createdAt).toLocaleDateString()} · Payment: <span className="capitalize">{order.paymentStatus}</span> · Status:{' '}
                        <span className="capitalize text-[#69462D] font-medium">{order.orderStatus.replace(/_/g, ' ')}</span>
                      </p>
                    </div>
                    <span className="text-lg font-medium tabular-nums text-[#292722]">{formatEur(order.totalCents)}</span>
                  </div>
                  <div className="space-y-1.5 text-sm text-[#81796D]">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.quantity} × {item.name}</span>
                        <span className="tabular-nums text-[#292722]">{formatEur(item.priceCents * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'workshops' && (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="bg-white border border-[#E5DED3] p-12 text-center space-y-4">
                <p className="font-serif text-2xl text-[#292722]">No workshop reservations yet</p>
                <Link to="/workshops" className="inline-block px-6 py-3 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em]">
                  Explore Workshops
                </Link>
              </div>
            ) : (
              bookings.map((bk) => (
                <div key={bk.id} className="bg-white border border-[#E5DED3] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-[0.16em] text-[#8A6548] tabular-nums">{bk.bookingNumber}</p>
                    <h3 className="font-serif text-2xl text-[#292722]">{bk.workshopTitle}</h3>
                    <p className="text-sm text-[#81796D] tabular-nums">
                      {bk.slotDate} · {bk.slotStartTime}–{bk.slotEndTime} · {bk.participantCount} participant(s)
                    </p>
                    <p className="text-xs text-[#69462D] capitalize">
                      Status: {bk.bookingStatus} · Payment: {bk.paymentStatus}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-medium tabular-nums">{formatEur(bk.totalAmountCents)}</span>
                    {['pending', 'confirmed'].includes(bk.bookingStatus) && (
                      <button
                        type="button"
                        onClick={() => handleCancelBooking(bk.id)}
                        className="px-4 py-2 border border-[#69462D] text-xs uppercase tracking-[0.14em] text-[#69462D] hover:bg-[#F0EDE5] cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="bg-white border border-[#E5DED3] p-8 space-y-6">
            <h2 className="font-serif text-2xl text-[#292722]">Personal Details &amp; Delivery Addresses</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Full Name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full border border-[#E5DED3] px-4 py-3 text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full border border-[#E5DED3] px-4 py-3 text-sm" />
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5DED3] space-y-4">
              <h3 className="text-xs uppercase tracking-[0.18em] text-[#81796D]">Saved Delivery Addresses</h3>
              {addresses.length === 0 ? (
                <p className="text-sm text-[#81796D]">No addresses saved yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="border border-[#E5DED3] p-4 flex justify-between gap-3 bg-[#F8F6F1]">
                      <div className="text-sm">
                        <p className="font-medium text-[#292722]">{addr.label}</p>
                        <p className="text-[#81796D]">{addr.street}</p>
                        <p className="text-[#81796D]">{addr.postalCode} {addr.city}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAddresses((prev) => prev.filter((a) => a.id !== addr.id))}
                        className="p-1.5 text-[#81796D] hover:text-[#69462D] cursor-pointer self-start"
                        aria-label="Remove address"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                <input
                  placeholder="Label (Home/Studio)"
                  value={newAddress.label}
                  onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
                  className="border border-[#E5DED3] px-3 py-2 text-sm"
                />
                <input
                  placeholder="Street address"
                  value={newAddress.street}
                  onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                  className="sm:col-span-2 border border-[#E5DED3] px-3 py-2 text-sm"
                />
                <input
                  placeholder="Postal code"
                  value={newAddress.postalCode}
                  onChange={(e) => setNewAddress({ ...newAddress, postalCode: e.target.value })}
                  className="border border-[#E5DED3] px-3 py-2 text-sm"
                />
              </div>
              <button
                type="button"
                onClick={handleAddAddress}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-[#E5DED3] text-xs uppercase tracking-[0.14em] hover:border-[#292722] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Address to List
              </button>
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="px-7 py-3.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.18em] hover:bg-[#69462D] cursor-pointer"
            >
              {savingProfile ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
