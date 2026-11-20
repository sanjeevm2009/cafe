import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, ArrowRight } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { formatEur } from '../../services/api';
import { EditorialImage } from '../../components/common/EditorialImage';
import { SeoHead } from '../../components/common/SeoHead';

export function CartPage() {
  const { cart, updateCartItem, removeCartItem, applyDiscountCode } = useApp();
  const [promoCode, setPromoCode] = useState('');

  const handlePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await applyDiscountCode(promoCode);
      setPromoCode('');
    } catch {
      // handled by toast
    }
  };

  return (
    <div className="bg-[#F8F6F1] py-12 lg:py-20 min-h-[75vh]">
      <SeoHead title="Your Basket – MAISON CRUMB" description="Review your artisan bread and pastry order before checkout." />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="pb-8 border-b border-[#E5DED3] mb-10">
          <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">Daily Bakehouse Order</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-[#292722] mt-1">Shopping Basket</h1>
        </div>

        {cart.items.length === 0 ? (
          <div className="bg-white border border-[#E5DED3] p-14 text-center space-y-5">
            <h2 className="font-serif text-3xl text-[#292722]">Your bakery basket is currently empty</h2>
            <p className="text-sm text-[#81796D] max-w-md mx-auto leading-relaxed">
              Explore our 72-hour sourdough boules, Touraine specialty breads, and morning viennoiserie.
            </p>
            <Link
              to="/creations"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.18em] hover:bg-[#69462D] transition-colors"
            >
              Explore Bread Collections
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-8 bg-white border border-[#E5DED3] divide-y divide-[#E5DED3]">
              {cart.items.map((item) => (
                <div key={item.id} className="p-6 flex flex-col sm:flex-row sm:items-center gap-5">
                  <EditorialImage
                    src={item.product.imageUrls[0]}
                    alt={item.product.name}
                    className="w-24 h-24 object-cover border border-[#E5DED3] shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-[#81796D]">
                      {item.product.categoryName} · {item.product.weight}
                    </p>
                    <Link to={`/creations/${item.product.slug}`} className="font-serif text-2xl text-[#292722] hover:text-[#8A6548]">
                      {item.product.name}
                    </Link>
                    <p className="text-sm text-[#81796D] tabular-nums">{formatEur(item.product.priceCents)} each</p>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="inline-flex items-center border border-[#E5DED3]">
                      <button
                        type="button"
                        onClick={() => updateCartItem(item.id, item.quantity - 1)}
                        className="p-2 hover:bg-[#F0EDE5] cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3.5 text-sm font-medium tabular-nums">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartItem(item.id, item.quantity + 1)}
                        className="p-2 hover:bg-[#F0EDE5] cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="text-base font-medium tabular-nums w-20 text-right">
                      {formatEur(item.product.priceCents * item.quantity)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeCartItem(item.id)}
                      className="p-2 text-[#81796D] hover:text-[#69462D] cursor-pointer"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="lg:col-span-4 bg-white border border-[#E5DED3] p-7 space-y-6">
              <h2 className="font-serif text-2xl text-[#292722] pb-3 border-b border-[#E5DED3]">Order Summary</h2>

              <form onSubmit={handlePromo} className="space-y-2">
                <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D]">Promotional Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="LEVAIN10 or PARIS5"
                    className="flex-1 border border-[#E5DED3] px-3 py-2 text-sm focus:outline-none focus:border-[#8A6548]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 border border-[#292722] text-xs uppercase tracking-[0.14em] hover:bg-[#292722] hover:text-[#F8F6F1] transition-colors cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </form>

              <div className="space-y-2.5 text-sm pt-2 border-t border-[#E5DED3]">
                <div className="flex justify-between text-[#81796D]">
                  <span>Subtotal</span>
                  <span className="tabular-nums text-[#292722]">{formatEur(cart.subtotalCents)}</span>
                </div>
                {cart.discountCents > 0 && (
                  <div className="flex justify-between text-[#69462D]">
                    <span>Discount ({cart.discountCode})</span>
                    <span className="tabular-nums">−{formatEur(cart.discountCents)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#81796D]">
                  <span>Parisian Delivery</span>
                  <span className="tabular-nums text-[#292722]">
                    {cart.deliveryFeeCents === 0 ? 'Complimentary' : formatEur(cart.deliveryFeeCents)}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t border-[#E5DED3] font-medium text-base text-[#292722]">
                  <span>Estimated Total</span>
                  <span className="tabular-nums">{formatEur(cart.totalCents)}</span>
                </div>
              </div>

              <Link
                to="/checkout"
                className="w-full inline-flex items-center justify-center gap-2 py-3.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.18em] hover:bg-[#69462D] transition-colors"
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
