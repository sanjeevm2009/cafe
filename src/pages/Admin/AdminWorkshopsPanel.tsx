import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { apiRequest, formatEur } from '../../services/api';
import type { Booking, Workshop } from '../../types';

export function AdminWorkshopsPanel() {
  const { pushToast } = useApp();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [showNewWs, setShowNewWs] = useState(false);

  // Workshop form
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [duration, setDuration] = useState('3.5 Hours');
  const [priceEur, setPriceEur] = useState('140');
  const [level, setLevel] = useState('All Levels');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('/src/assets/images/workshop_atelier_hands_1795207472589.jpg');

  // Slot addition state
  const [slotWsId, setSlotWsId] = useState('');
  const [slotDate, setSlotDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('13:00');
  const [maxGuests, setMaxGuests] = useState('8');

  const loadData = async () => {
    const [wRes, bRes] = await Promise.all([
      apiRequest<{ workshops: Workshop[] }>('/api/workshops'),
      apiRequest<{ bookings: Booking[] }>('/api/admin/bookings'),
    ]);
    setWorkshops(wRes.workshops);
    setBookings(bRes.bookings);
    if (!slotWsId && wRes.workshops[0]) setSlotWsId(wRes.workshops[0].id);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/workshops', {
        method: 'POST',
        body: JSON.stringify({
          title,
          slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          duration,
          priceCents: Math.round(Number(priceEur) * 100),
          level,
          description,
          imageUrls: [imageUrl],
          isActive: true,
        }),
      });
      setShowNewWs(false);
      setTitle('');
      setSlug('');
      setDescription('');
      pushToast('success', 'Workshop created.');
      loadData();
    } catch (err: any) {
      pushToast('error', err.message || 'Could not create workshop.');
    }
  };

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotWsId || !slotDate) return;
    try {
      await apiRequest(`/api/workshops/${slotWsId}/slots`, {
        method: 'POST',
        body: JSON.stringify({
          date: slotDate,
          startTime,
          endTime,
          maximumParticipants: Number(maxGuests),
        }),
      });
      pushToast('success', 'Workshop time slot scheduled.');
      loadData();
    } catch (err: any) {
      pushToast('error', err.message || 'Could not add slot.');
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      await apiRequest(`/api/workshop-slots/${slotId}`, { method: 'DELETE' });
      pushToast('info', 'Slot removed or closed.');
      loadData();
    } catch (err: any) {
      pushToast('error', err.message || 'Could not remove slot.');
    }
  };

  const handleBookingStatus = async (bookingId: string, bookingStatus: string) => {
    try {
      await apiRequest(`/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ bookingStatus }),
      });
      pushToast('success', 'Booking status updated.');
      loadData();
    } catch (err: any) {
      pushToast('error', err.message || 'Could not update booking.');
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-[#292722]">Workshops &amp; Reservations</h2>
        <button
          type="button"
          onClick={() => setShowNewWs((v) => !v)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em] cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Create Workshop
        </button>
      </div>

      {showNewWs && (
        <form onSubmit={handleCreateWorkshop} className="bg-white border border-[#E5DED3] p-6 space-y-4">
          <h3 className="font-serif text-2xl text-[#292722]">New Artisan Workshop</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input placeholder="Workshop title" value={title} onChange={(e) => setTitle(e.target.value)} required className="border border-[#E5DED3] px-3 py-2 text-sm" />
            <input placeholder="Slug (optional)" value={slug} onChange={(e) => setSlug(e.target.value)} className="border border-[#E5DED3] px-3 py-2 text-sm" />
            <input placeholder="Duration (e.g. 4 Hours)" value={duration} onChange={(e) => setDuration(e.target.value)} required className="border border-[#E5DED3] px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <input type="number" placeholder="Price EUR" value={priceEur} onChange={(e) => setPriceEur(e.target.value)} required className="border border-[#E5DED3] px-3 py-2 text-sm" />
            <input placeholder="Level" value={level} onChange={(e) => setLevel(e.target.value)} required className="border border-[#E5DED3] px-3 py-2 text-sm" />
            <input placeholder="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} required className="border border-[#E5DED3] px-3 py-2 text-sm" />
          </div>
          <textarea rows={3} placeholder="Detailed class syllabus..." value={description} onChange={(e) => setDescription(e.target.value)} required className="w-full border border-[#E5DED3] px-3 py-2 text-sm" />
          <button type="submit" className="px-6 py-2.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em] cursor-pointer">
            Publish Workshop
          </button>
        </form>
      )}

      {/* Schedule Slot Form */}
      <form onSubmit={handleAddSlot} className="bg-white border border-[#E5DED3] p-6 space-y-4">
        <h3 className="font-serif text-xl text-[#292722]">Schedule a Session Slot</h3>
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-[11px] uppercase tracking-wider text-[#81796D] mb-1">Workshop</label>
            <select value={slotWsId} onChange={(e) => setSlotWsId(e.target.value)} className="w-full border border-[#E5DED3] px-3 py-2 text-sm bg-white">
              {workshops.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#81796D] mb-1">Date</label>
            <input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} required className="w-full border border-[#E5DED3] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#81796D] mb-1">Start – End</label>
            <div className="flex gap-1">
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="w-full border border-[#E5DED3] px-2 py-2 text-xs" />
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="w-full border border-[#E5DED3] px-2 py-2 text-xs" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-[#81796D] mb-1">Max Guests</label>
            <input type="number" min="1" max="40" value={maxGuests} onChange={(e) => setMaxGuests(e.target.value)} required className="w-full border border-[#E5DED3] px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.14em] cursor-pointer">
            Add Slot
          </button>
        </div>
      </form>

      {/* Workshops & Slots List */}
      <div className="space-y-4">
        {workshops.map((w) => (
          <div key={w.id} className="bg-white border border-[#E5DED3] p-6 space-y-4">
            <div className="flex flex-wrap justify-between gap-4">
              <div>
                <h3 className="font-serif text-2xl text-[#292722]">{w.title}</h3>
                <p className="text-xs text-[#81796D]">{w.duration} · {w.level} · {formatEur(w.priceCents)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(w.slots || []).map((s) => (
                <div key={s.id} className="border border-[#E5DED3] bg-[#F8F6F1] p-3.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-medium text-[#292722] tabular-nums">{s.date} · {s.startTime}–{s.endTime}</p>
                    <p className="text-[#81796D] tabular-nums">{s.bookedParticipants} / {s.maximumParticipants} booked ({s.status})</p>
                  </div>
                  <button type="button" onClick={() => handleDeleteSlot(s.id)} className="text-[#81796D] hover:text-[#69462D] cursor-pointer" aria-label="Remove slot">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Guest Bookings Table */}
      <div className="bg-white border border-[#E5DED3] overflow-x-auto">
        <div className="p-5 border-b border-[#E5DED3]">
          <h3 className="font-serif text-2xl text-[#292722]">All Workshop Bookings</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[#E5DED3] bg-[#F8F6F1] text-[11px] uppercase tracking-[0.16em] text-[#81796D]">
            <tr>
              <th className="py-3 px-4">Reference</th>
              <th className="py-3 px-4">Guest</th>
              <th className="py-3 px-4">Workshop &amp; Date</th>
              <th className="py-3 px-4">Seats</th>
              <th className="py-3 px-4">Total</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5DED3]">
            {bookings.map((b) => (
              <tr key={b.id}>
                <td className="py-3 px-4 tabular-nums font-medium">{b.bookingNumber}</td>
                <td className="py-3 px-4">
                  <p>{b.customerDetails.fullName}</p>
                  <p className="text-xs text-[#81796D]">{b.customerDetails.email}</p>
                </td>
                <td className="py-3 px-4">
                  <p>{b.workshopTitle}</p>
                  <p className="text-xs text-[#81796D] tabular-nums">{b.slotDate} {b.slotStartTime}</p>
                </td>
                <td className="py-3 px-4 tabular-nums">{b.participantCount}</td>
                <td className="py-3 px-4 tabular-nums">{formatEur(b.totalAmountCents)}</td>
                <td className="py-3 px-4">
                  <select
                    value={b.bookingStatus}
                    onChange={(e) => handleBookingStatus(b.id, e.target.value)}
                    className="border border-[#E5DED3] px-2.5 py-1 text-xs bg-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
