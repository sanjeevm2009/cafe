import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { apiRequest, formatEur } from '../../services/api';
import { SeoHead } from '../../components/common/SeoHead';
import type { Order } from '../../types';

export function OrderConfirmationPage() {
  const { id } = useParams();
  const location = useLocation();
  const state = (location.state || {}) as { email?: string; paymentIntentId?: string };

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const query = state.email ? `?email=${encodeURIComponent(state.email)}` : '';
    apiRequest<{ order: Order }>(`/api/orders/${encodeURIComponent(id)}${query}`)
      .then((res) => setOrder(res.order))
      .catch((err) => setError(err.message || 'Could not load order receipt.'))
      .finally(() => setLoading(false));
  }, [id, state.email]);

  if (loading) {
    return <div className="max-w-3xl mx-auto px-4 py-20"><div className="h-64 bg-white border border-[#E5DED3] animate-pulse" /></div>;
  }

  if (error || !order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="font-serif text-3xl text-[#292722]">Order Receipt Unavailable</h1>
        <p className="text-sm text-[#81796D]">{error || 'Please sign in to view your order history.'}</p>
        <Link to="/account" className="inline-block px-6 py-3 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em]">
          View My Account
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F6F1] py-16 lg:py-24">
      <SeoHead title={`Order ${order.orderNumber} – MAISON CRUMB`} description="Your Maison Crumb order confirmation." />
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="bg-white border border-[#E5DED3] p-8 sm:p-12 space-y-8">
          <div className="space-y-3 border-b border-[#E5DED3] pb-6">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#8A6548]">
              <CheckCircle2 className="w-4 h-4" /> Order Recorded
            </div>
            <h1 className="font-serif text-4xl text-[#292722]">Merci, {order.customerDetails.fullName}</h1>
            <p className="text-sm text-[#81796D]">
              Order <strong className="text-[#292722] tabular-nums">{order.orderNumber}</strong> · Order Status:{' '}
              <span className="capitalize text-[#292722]">{order.orderStatus.replace(/_/g, ' ')}</span> · Payment Status:{' '}
              <span className="capitalize text-[#69462D]">{order.paymentStatus}</span>
            </p>
            {state.paymentIntentId && (
              <p className="text-xs text-[#81796D]">
                Stripe PaymentIntent created (<span className="font-mono">{state.paymentIntentId}</span>). Payment marks as paid once verified via Stripe webhook.
              </p>
            )}
          </div>

          <div className="divide-y divide-[#E5DED3]">
            {order.items.map((item, i) => (
              <div key={i} className="py-3 flex justify-between text-sm">
                <span>{item.quantity} × {item.name} ({item.weight})</span>
                <span className="tabular-nums font-medium">{formatEur(item.priceCents * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="bg-[#F8F6F1] border border-[#E5DED3] p-5 space-y-2 text-sm">
            <div className="flex justify-between text-[#81796D]">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatEur(order.subtotalCents)}</span>
            </div>
            {order.discountCents > 0 && (
              <div className="flex justify-between text-[#69462D]">
                <span>Discount</span>
                <span className="tabular-nums">−{formatEur(order.discountCents)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#81796D]">
              <span>Delivery</span>
              <span className="tabular-nums">{order.deliveryFeeCents === 0 ? 'Complimentary' : formatEur(order.deliveryFeeCents)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[#E5DED3] font-medium text-base text-[#292722]">
              <span>Total</span>
              <span className="tabular-nums">{formatEur(order.totalCents)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/creations" className="px-6 py-3 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em]">
              Continue Browsing
            </Link>
            <Link to="/account" className="px-6 py-3 border border-[#E5DED3] text-[#292722] text-xs uppercase tracking-[0.16em]">
              View My Orders
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
