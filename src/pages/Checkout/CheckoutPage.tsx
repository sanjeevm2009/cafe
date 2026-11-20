import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { apiRequest, formatEur } from '../../services/api';
import { SeoHead } from '../../components/common/SeoHead';
import type { Order } from '../../types';

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Valid email address is required'),
  phone: z.string().min(6, 'Phone number is required'),
  address: z.string().min(4, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  instructions: z.string().optional(),
});

type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export function CheckoutPage() {
  const { user, cart, refreshCart, pushToast } = useApp();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [stripeConfigured, setStripeConfigured] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'bakery_pickup'>('bakery_pickup');
  const [submitting, setSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const idempotencyKey = useMemo(() => `ord-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, []);

  const defaultAddr = user?.addresses?.find((a) => a.isDefault) || user?.addresses?.[0];

  const {
    register,
    trigger,
    getValues,
    reset,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: defaultAddr?.street || '',
      city: defaultAddr?.city || 'Paris',
      postalCode: defaultAddr?.postalCode || '75009',
      instructions: defaultAddr?.instructions || '',
    },
  });

  useEffect(() => {
    if (user) {
      const addr = user.addresses?.find((a) => a.isDefault) || user.addresses?.[0];
      reset({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || '',
        address: addr?.street || '',
        city: addr?.city || 'Paris',
        postalCode: addr?.postalCode || '75009',
        instructions: addr?.instructions || '',
      });
    }
  }, [user, reset]);

  useEffect(() => {
    apiRequest<{ stripeConfigured: boolean }>('/api/payments/config')
      .then((res) => {
        setStripeConfigured(res.stripeConfigured);
        if (res.stripeConfigured) setPaymentMethod('stripe');
      })
      .catch(() => setStripeConfigured(false));
  }, []);

  if (cart.items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-4">
        <SeoHead title="Checkout – MAISON CRUMB" description="Complete your Maison Crumb bakery order." />
        <h1 className="font-serif text-4xl text-[#292722]">Your basket is empty</h1>
        <p className="text-sm text-[#81796D]">Add fresh sourdough loaves or pastries before proceeding to checkout.</p>
        <Link to="/creations" className="inline-block px-6 py-3 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em]">
          Explore Creations
        </Link>
      </div>
    );
  }

  const nextStep = async () => {
    if (step === 1) {
      const ok = await trigger(['fullName', 'email', 'phone']);
      if (ok) setStep(2);
    } else if (step === 2) {
      const ok = await trigger(['address', 'city', 'postalCode']);
      if (ok) setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handlePlaceOrder = async () => {
    const valid = await trigger();
    if (!valid) {
      setStep(1);
      return;
    }

    const values = getValues();
    setPaymentError(null);
    setSubmitting(true);

    try {
      const res = await apiRequest<{ order: Order }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerDetails: {
            fullName: values.fullName,
            email: values.email,
            phone: values.phone,
          },
          deliveryAddress: {
            address: values.address,
            city: values.city,
            postalCode: values.postalCode,
            instructions: values.instructions || '',
          },
          paymentMethod,
          idempotencyKey,
        }),
      });

      if (paymentMethod === 'stripe') {
        // Initiate server-side Stripe PaymentIntent
        const paymentRes = await apiRequest<{ clientSecret: string; paymentIntentId: string }>('/api/payments/create', {
          method: 'POST',
          body: JSON.stringify({ orderId: res.order.id }),
        });
        await refreshCart();
        navigate(`/order-confirmation/${res.order.orderNumber}`, {
          state: { email: values.email, stripeClientSecret: paymentRes.clientSecret, paymentIntentId: paymentRes.paymentIntentId },
        });
        return;
      }

      await refreshCart();
      pushToast('success', `Order ${res.order.orderNumber} reserved.`);
      navigate(`/order-confirmation/${res.order.orderNumber}`, {
        state: { email: values.email },
      });
    } catch (err: any) {
      setPaymentError(err.message || 'Unable to complete order.');
    } finally {
      setSubmitting(false);
    }
  };

  const formVals = getValues();

  return (
    <div className="bg-[#F8F6F1] py-12 lg:py-20">
      <SeoHead title="Checkout – MAISON CRUMB" description="Secure four-step checkout for your Maison Crumb order." />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="pb-8 border-b border-[#E5DED3] mb-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">Server-Verified Pricing</p>
            <h1 className="font-serif text-4xl text-[#292722] mt-1">Checkout</h1>
          </div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.14em]">
            {[
              { n: 1, label: '01. Guest' },
              { n: 2, label: '02. Delivery' },
              { n: 3, label: '03. Review' },
              { n: 4, label: '04. Payment' },
            ].map((s) => (
              <button
                key={s.n}
                type="button"
                onClick={() => s.n < step && setStep(s.n as any)}
                className={`px-3 py-1.5 border ${
                  step === s.n
                    ? 'bg-[#292722] text-[#F8F6F1] border-[#292722]'
                    : step > s.n
                    ? 'bg-white text-[#69462D] border-[#E5DED3] cursor-pointer'
                    : 'bg-transparent text-[#81796D] border-[#E5DED3]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 bg-white border border-[#E5DED3] p-8 space-y-6">
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="font-serif text-2xl text-[#292722]">Step 1 · Customer Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-2">Full Name</label>
                    <input {...register('fullName')} className="w-full border border-[#E5DED3] px-4 py-3 text-sm focus:outline-none focus:border-[#8A6548]" />
                    {errors.fullName && <p className="text-xs text-[#69462D] mt-1">{errors.fullName.message}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-2">Email Address</label>
                      <input type="email" {...register('email')} className="w-full border border-[#E5DED3] px-4 py-3 text-sm focus:outline-none focus:border-[#8A6548]" />
                      {errors.email && <p className="text-xs text-[#69462D] mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-2">Phone Number</label>
                      <input {...register('phone')} className="w-full border border-[#E5DED3] px-4 py-3 text-sm focus:outline-none focus:border-[#8A6548]" />
                      {errors.phone && <p className="text-xs text-[#69462D] mt-1">{errors.phone.message}</p>}
                    </div>
                  </div>
                </div>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-7 py-3 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em] hover:bg-[#69462D] cursor-pointer"
                  >
                    Continue to Delivery
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <h2 className="font-serif text-2xl text-[#292722]">Step 2 · Delivery Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-2">Street Address</label>
                    <input {...register('address')} className="w-full border border-[#E5DED3] px-4 py-3 text-sm focus:outline-none focus:border-[#8A6548]" />
                    {errors.address && <p className="text-xs text-[#69462D] mt-1">{errors.address.message}</p>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-2">City</label>
                      <input {...register('city')} className="w-full border border-[#E5DED3] px-4 py-3 text-sm focus:outline-none focus:border-[#8A6548]" />
                      {errors.city && <p className="text-xs text-[#69462D] mt-1">{errors.city.message}</p>}
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-2">Postal Code</label>
                      <input {...register('postalCode')} className="w-full border border-[#E5DED3] px-4 py-3 text-sm focus:outline-none focus:border-[#8A6548]" />
                      {errors.postalCode && <p className="text-xs text-[#69462D] mt-1">{errors.postalCode.message}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-2">Delivery Instructions (Optional)</label>
                    <textarea rows={3} {...register('instructions')} placeholder="Digicode, courtyard floor, or preferred morning window..." className="w-full border border-[#E5DED3] px-4 py-3 text-sm focus:outline-none focus:border-[#8A6548]" />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setStep(1)} className="px-5 py-3 border border-[#E5DED3] text-xs uppercase tracking-[0.16em] cursor-pointer">
                    Back
                  </button>
                  <button type="button" onClick={nextStep} className="px-7 py-3 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em] hover:bg-[#69462D] cursor-pointer">
                    Review Order
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <h2 className="font-serif text-2xl text-[#292722]">Step 3 · Order Review</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#F8F6F1] border border-[#E5DED3] p-5 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1">Guest</p>
                    <p className="font-medium text-[#292722]">{formVals.fullName}</p>
                    <p className="text-[#81796D]">{formVals.email}</p>
                    <p className="text-[#81796D] tabular-nums">{formVals.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1">Delivery Address</p>
                    <p className="font-medium text-[#292722]">{formVals.address}</p>
                    <p className="text-[#81796D]">{formVals.postalCode} {formVals.city}</p>
                    {formVals.instructions && <p className="text-xs text-[#69462D] mt-1">{formVals.instructions}</p>}
                  </div>
                </div>

                <div className="divide-y divide-[#E5DED3] border-t border-b border-[#E5DED3]">
                  {cart.items.map((item) => (
                    <div key={item.id} className="py-3 flex justify-between text-sm">
                      <span>{item.quantity} × {item.product.name} ({item.product.weight})</span>
                      <span className="tabular-nums font-medium">{formatEur(item.product.priceCents * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(2)} className="px-5 py-3 border border-[#E5DED3] text-xs uppercase tracking-[0.16em] cursor-pointer">
                    Back
                  </button>
                  <button type="button" onClick={nextStep} className="px-7 py-3 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em] hover:bg-[#69462D] cursor-pointer">
                    Proceed to Payment
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-2xl text-[#292722]">Step 4 · Payment Method</h2>
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#81796D]">
                    <Lock className="w-3.5 h-3.5" /> Server-verified checkout
                  </span>
                </div>

                <div className="space-y-3">
                  <label className={`block border p-5 cursor-pointer ${paymentMethod === 'stripe' ? 'border-[#292722] bg-[#F8F6F1]' : 'border-[#E5DED3]'}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === 'stripe'}
                        disabled={!stripeConfigured}
                        onChange={() => setPaymentMethod('stripe')}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <p className="font-medium text-sm text-[#292722]">
                          Card Payment via Stripe {!stripeConfigured && '(Requires Environment Configuration)'}
                        </p>
                        <p className="text-xs text-[#81796D]">
                          {stripeConfigured
                            ? 'Creates a verified server-side Stripe PaymentIntent and confirms via cryptographic webhook.'
                            : 'To enable live card payments, configure STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, and STRIPE_WEBHOOK_SECRET on the server.'}
                        </p>
                      </div>
                    </div>
                  </label>

                  <label className={`block border p-5 cursor-pointer ${paymentMethod === 'bakery_pickup' ? 'border-[#292722] bg-[#F8F6F1]' : 'border-[#E5DED3]'}`}>
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={paymentMethod === 'bakery_pickup'}
                        onChange={() => setPaymentMethod('bakery_pickup')}
                        className="mt-1"
                      />
                      <div className="space-y-1">
                        <p className="font-medium text-sm text-[#292722]">Pay at Paris Bakery Counter / Upon Courier Delivery</p>
                        <p className="text-xs text-[#81796D]">
                          Reserves your loaves immediately from today’s bake. Payment status remains pending until settled in person.
                        </p>
                      </div>
                    </div>
                  </label>
                </div>

                {paymentError && (
                  <div className="border border-[#69462D] bg-[#F0EDE5] p-4 flex items-start gap-3 text-sm text-[#69462D]">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Payment could not be processed</p>
                      <p className="text-xs mt-1">{paymentError}</p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setStep(3)} className="px-5 py-3 border border-[#E5DED3] text-xs uppercase tracking-[0.16em] cursor-pointer">
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handlePlaceOrder}
                    className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.18em] hover:bg-[#69462D] transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {submitting ? 'Confirming Order...' : `Confirm Order · ${formatEur(cart.totalCents)}`}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Persistent Summary Rail */}
          <aside className="lg:col-span-4 bg-white border border-[#E5DED3] p-7 space-y-4">
            <h3 className="font-serif text-2xl text-[#292722] pb-3 border-b border-[#E5DED3]">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-[#81796D]">
                <span>Items ({cart.items.reduce((a, b) => a + b.quantity, 0)})</span>
                <span className="tabular-nums text-[#292722]">{formatEur(cart.subtotalCents)}</span>
              </div>
              {cart.discountCents > 0 && (
                <div className="flex justify-between text-[#69462D]">
                  <span>Discount ({cart.discountCode})</span>
                  <span className="tabular-nums">−{formatEur(cart.discountCents)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#81796D]">
                <span>Delivery Fee</span>
                <span className="tabular-nums text-[#292722]">
                  {cart.deliveryFeeCents === 0 ? 'Complimentary' : formatEur(cart.deliveryFeeCents)}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t border-[#E5DED3] font-medium text-base text-[#292722]">
                <span>Total Due</span>
                <span className="tabular-nums">{formatEur(cart.totalCents)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
