import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Clock, MapPin, Users } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { apiRequest, formatEur } from '../../services/api';
import { EditorialImage } from '../../components/common/EditorialImage';
import { SeoHead } from '../../components/common/SeoHead';
import type { Booking, Workshop, WorkshopSlot } from '../../types';

const bookingFormSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(6, 'Phone number is required'),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingFormSchema>;

export function WorkshopDetailsPage() {
  const { slug } = useParams();
  const { user, pushToast } = useApp();

  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<WorkshopSlot | null>(null);
  const [participantCount, setParticipantCount] = useState(1);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'bakery_pickup'>('bakery_pickup');
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      notes: '',
    },
  });

  useEffect(() => {
    if (user) {
      reset({ fullName: user.fullName, email: user.email, phone: user.phone || '', notes: '' });
    }
  }, [user, reset]);

  const loadWorkshop = async () => {
    if (!slug) return;
    try {
      const res = await apiRequest<{ workshop: Workshop }>(`/api/workshops/${encodeURIComponent(slug)}`);
      setWorkshop(res.workshop);
      const firstOpen = (res.workshop.slots || []).find((s) => s.status === 'open' && s.bookedParticipants < s.maximumParticipants);
      setSelectedSlot(firstOpen || res.workshop.slots?.[0] || null);
    } catch {
      setWorkshop(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkshop();
    apiRequest<{ stripeConfigured: boolean }>('/api/payments/config')
      .then((res) => setStripeConfigured(res.stripeConfigured))
      .catch(() => setStripeConfigured(false));
  }, [slug]);

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-20"><div className="h-96 bg-white border border-[#E5DED3] animate-pulse" /></div>;
  }

  if (!workshop) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="font-serif text-3xl text-[#292722]">Workshop Not Found</h1>
        <Link to="/workshops" className="inline-block px-6 py-3 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em]">
          All Workshops
        </Link>
      </div>
    );
  }

  const remainingSeats = selectedSlot ? Math.max(0, selectedSlot.maximumParticipants - selectedSlot.bookedParticipants) : 0;
  const slotBookable = Boolean(selectedSlot && selectedSlot.status === 'open' && remainingSeats > 0);

  const onSubmitBooking = async (values: BookingFormValues) => {
    if (!selectedSlot || !slotBookable) return;
    try {
      const res = await apiRequest<{ booking: Booking }>('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          workshopId: workshop.id,
          slotId: selectedSlot.id,
          participantCount,
          paymentMethod,
          customerDetails: values,
        }),
      });
      if (paymentMethod === 'stripe') {
        await apiRequest('/api/payments/create', {
          method: 'POST',
          body: JSON.stringify({ bookingId: res.booking.id }),
        });
      }
      setConfirmedBooking(res.booking);
      await loadWorkshop();
      pushToast('success', `Workshop reservation ${res.booking.bookingNumber} confirmed.`);
    } catch (err: any) {
      pushToast('error', err.message || 'Unable to reserve workshop.');
    }
  };

  return (
    <div className="bg-[#F8F6F1] py-12 lg:py-16">
      <SeoHead title={`${workshop.title} – MAISON CRUMB Workshops`} description={workshop.description.slice(0, 155)} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 space-y-10">
        <Link to="/workshops" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#81796D] hover:text-[#292722]">
          <ArrowLeft className="w-3.5 h-3.5" /> All Workshops
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          {/* Workshop Details */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-white border border-[#E5DED3] overflow-hidden">
              <EditorialImage src={workshop.imageUrls[0]} alt={workshop.title} priority className="w-full aspect-[4/3] object-cover" />
            </div>
            <div className="bg-white border border-[#E5DED3] p-8 space-y-4">
              <div className="flex flex-wrap gap-4 text-xs uppercase tracking-[0.16em] text-[#81796D]">
                <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[#8A6548]" /> {workshop.duration}</span>
                <span>·</span>
                <span>{workshop.level}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#8A6548]" /> {workshop.location}</span>
              </div>
              <h1 className="font-serif text-3xl sm:text-4xl text-[#292722]">{workshop.title}</h1>
              <p className="text-sm text-[#81796D] leading-relaxed">{workshop.description}</p>
            </div>
          </div>

          {/* Booking Engine */}
          <div className="lg:col-span-6 bg-white border border-[#E5DED3] p-8 space-y-6">
            {confirmedBooking ? (
              <div className="py-6 space-y-5">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#8A6548]">
                  <CheckCircle2 className="w-4 h-4" /> Reservation Recorded
                </div>
                <h2 className="font-serif text-3xl text-[#292722]">We look forward to baking with you</h2>
                <div className="bg-[#F8F6F1] border border-[#E5DED3] p-5 space-y-2 text-sm">
                  <p><strong>Reference:</strong> <span className="tabular-nums">{confirmedBooking.bookingNumber}</span></p>
                  <p><strong>Session:</strong> {confirmedBooking.slotDate} · {confirmedBooking.slotStartTime}–{confirmedBooking.slotEndTime}</p>
                  <p><strong>Participants:</strong> {confirmedBooking.participantCount}</p>
                  <p><strong>Total:</strong> <span className="tabular-nums">{formatEur(confirmedBooking.totalAmountCents)}</span> ({confirmedBooking.bookingStatus})</p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmedBooking(null)}
                    className="px-5 py-3 border border-[#E5DED3] text-xs uppercase tracking-[0.16em] cursor-pointer"
                  >
                    Book Another Date
                  </button>
                  <Link to="/account" className="px-6 py-3 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em]">
                    View My Bookings
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-baseline justify-between pb-4 border-b border-[#E5DED3]">
                  <h2 className="font-serif text-2xl text-[#292722]">Reserve Your Place</h2>
                  <span className="text-xl font-medium tabular-nums text-[#292722]">{formatEur(workshop.priceCents)} / guest</span>
                </div>

                {/* Slot Selector */}
                <div className="space-y-3">
                  <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D]">1. Choose Date &amp; Time Slot</label>
                  <div className="space-y-2.5">
                    {(workshop.slots || []).map((slot) => {
                      const rem = Math.max(0, slot.maximumParticipants - slot.bookedParticipants);
                      const isFull = slot.status !== 'open' || rem === 0;
                      const isSelected = selectedSlot?.id === slot.id;
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => {
                            setSelectedSlot(slot);
                            if (rem > 0 && participantCount > rem) setParticipantCount(rem);
                          }}
                          className={`w-full text-left p-4 border transition-colors flex items-center justify-between gap-4 cursor-pointer ${
                            isSelected
                              ? 'border-[#292722] bg-[#F8F6F1]'
                              : 'border-[#E5DED3] bg-white hover:border-[#8A6548]'
                          }`}
                        >
                          <div>
                            <p className="font-medium text-sm text-[#292722] tabular-nums">
                              {slot.date} · {slot.startTime} – {slot.endTime}
                            </p>
                            <p className="text-xs text-[#81796D] mt-0.5 inline-flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" />
                              {isFull ? 'Fully Booked' : `${rem} of ${slot.maximumParticipants} seats remaining`}
                            </p>
                          </div>
                          <span className={`text-xs uppercase tracking-[0.14em] ${isFull ? 'text-[#81796D]' : 'text-[#69462D]'}`}>
                            {isFull ? 'Closed' : isSelected ? 'Selected' : 'Available'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {!slotBookable ? (
                  <div className="p-4 bg-[#F0EDE5] border border-[#E5DED3] text-sm text-[#69462D]">
                    This session is fully booked or closed. Please choose another available date above.
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmitBooking)} className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-2">
                        2. Number of Participants (Max {remainingSeats})
                      </label>
                      <select
                        value={participantCount}
                        onChange={(e) => setParticipantCount(Number(e.target.value))}
                        className="w-full border border-[#E5DED3] px-4 py-3 text-sm bg-white focus:outline-none focus:border-[#8A6548]"
                      >
                        {Array.from({ length: remainingSeats }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? 'Participant' : 'Participants'} — {formatEur(workshop.priceCents * n)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Full Name</label>
                        <input {...register('fullName')} className="w-full border border-[#E5DED3] px-3.5 py-2.5 text-sm" />
                        {errors.fullName && <p className="text-xs text-[#69462D] mt-1">{errors.fullName.message}</p>}
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Phone</label>
                        <input {...register('phone')} className="w-full border border-[#E5DED3] px-3.5 py-2.5 text-sm" />
                        {errors.phone && <p className="text-xs text-[#69462D] mt-1">{errors.phone.message}</p>}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Email Address</label>
                      <input type="email" {...register('email')} className="w-full border border-[#E5DED3] px-3.5 py-2.5 text-sm" />
                      {errors.email && <p className="text-xs text-[#69462D] mt-1">{errors.email.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Dietary Notes (Optional)</label>
                      <input {...register('notes')} className="w-full border border-[#E5DED3] px-3.5 py-2.5 text-sm" />
                    </div>

                    <div className="pt-2 space-y-2">
                      <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D]">Payment Option</label>
                      <div className="flex flex-col gap-2 text-xs">
                        <label className="flex items-center gap-2 border border-[#E5DED3] p-3 cursor-pointer">
                          <input
                            type="radio"
                            checked={paymentMethod === 'bakery_pickup'}
                            onChange={() => setPaymentMethod('bakery_pickup')}
                          />
                          <span>Reserve seat &amp; settle at Rue des Martyrs Atelier</span>
                        </label>
                        <label className={`flex items-center gap-2 border border-[#E5DED3] p-3 ${stripeConfigured ? 'cursor-pointer' : 'opacity-60'}`}>
                          <input
                            type="radio"
                            disabled={!stripeConfigured}
                            checked={paymentMethod === 'stripe'}
                            onChange={() => setPaymentMethod('stripe')}
                          />
                          <span>Online Card Payment via Stripe {!stripeConfigured && '(Requires Stripe ENV configuration)'}</span>
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.18em] hover:bg-[#69462D] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting
                        ? 'Reserving Seats...'
                        : `Reserve ${participantCount} Seat(s) · ${formatEur(workshop.priceCents * participantCount)}`}
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
