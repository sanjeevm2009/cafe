import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2, X, ArrowRight } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { formatEur } from '../../services/api';
import { EditorialImage } from '../common/EditorialImage';

export function CartDrawer() {
  const { cart, cartDrawerOpen, setCartDrawerOpen, updateCartItem, removeCartItem, applyDiscountCode } = useApp();
  const [promoInput, setPromoInput] = useState('');
  const navigate = useNavigate();

  if (!cartDrawerOpen) return null;

  const remainingForFreeDelivery = Math.max(0, cart.freeDeliveryThresholdCents - (cart.subtotalCents - cart.discountCents));

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await applyDiscountCode(promoInput);
      setPromoInput('');
    } catch {
      // handled by toast
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#292722]/45 backdrop-blur-xs" role="dialog" aria-modal="true" aria-label="Bakery Basket">
      <div className="w-full max-w-md bg-[#F8F6F1] h-full flex flex-col border-l border-[#E5DED3] shadow-2xl">
        <div className="px-6 py-5 border-b border-[#E5DED3] flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#81796D]">Daily Bakehouse Order</p>
            <h2 className="font-serif text-2xl text-[#292722]">Your Basket</h2>
          </div>
          <button
            type="button"
            onClick={() => setCartDrawerOpen(false)}
            aria-label="Close basket"
            className="p-2 text-[#81796D] hover:text-[#292722] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {cart.items.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <p className="font-serif text-2xl text-[#292722]">Your basket is empty</p>
              <p className="text-sm text-[#81796D] max-w-xs mx-auto leading-relaxed">
                Explore our 72-hour sourdough boules, granite-baked baguettes, and cultured butter croissants.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCartDrawerOpen(false);
                  navigate('/creations');
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em] hover:bg-[#69462D] transition-colors cursor-pointer"
              >
                Explore Creations
              </button>
            </div>
          ) : (
            <>
              <div className="bg-[#F0EDE5] border border-[#E5DED3] px-4 py-3 text-xs text-[#69462D]">
                {remainingForFreeDelivery === 0
                  ? 'Complimentary Parisian courier delivery unlocked.'
                  : `Add ${formatEur(remainingForFreeDelivery)} more for complimentary Parisian delivery.`}
              </div>

              <div className="divide-y divide-[#E5DED3]">
                {cart.items.map((item) => (
                  <div key={item.id} className="py-4 flex gap-4">
                    <EditorialImage
                      src={item.product.imageUrls[0]}
                      alt={item.product.name}
                      className="w-20 h-20 object-cover border border-[#E5DED3] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/creations/${item.product.slug}`}
                          onClick={() => setCartDrawerOpen(false)}
                          className="font-serif text-lg text-[#292722] hover:text-[#8A6548] leading-snug"
                        >
                          {item.product.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeCartItem(item.id)}
                          aria-label={`Remove ${item.product.name}`}
                          className="p-1 text-[#81796D] hover:text-[#69462D] cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-xs text-[#81796D] mt-0.5">{item.product.weight}</p>
                      <div className="flex items-center justify-between mt-3">
                        <div className="inline-flex items-center border border-[#E5DED3] bg-white">
                          <button
                            type="button"
                            onClick={() => updateCartItem(item.id, item.quantity - 1)}
                            aria-label="Decrease quantity"
                            className="p-1.5 text-[#292722] hover:bg-[#F0EDE5] cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-xs font-medium tabular-nums">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartItem(item.id, item.quantity + 1)}
                            aria-label="Increase quantity"
                            className="p-1.5 text-[#292722] hover:bg-[#F0EDE5] cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-sm font-medium tabular-nums text-[#292722]">
                          {formatEur(item.product.priceCents * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="border-t border-[#E5DED3] bg-[#F0EDE5] px-6 py-5 space-y-4">
            <form onSubmit={handleApplyPromo} className="flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder="Promo code (e.g. LEVAIN10)"
                className="flex-1 bg-white border border-[#E5DED3] px-3 py-2 text-xs text-[#292722] focus:outline-none focus:border-[#8A6548]"
              />
              <button
                type="submit"
                className="px-4 py-2 border border-[#292722] text-xs uppercase tracking-[0.14em] text-[#292722] hover:bg-[#292722] hover:text-[#F8F6F1] transition-colors cursor-pointer"
              >
                Apply
              </button>
            </form>

            <div className="space-y-1.5 text-sm">
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
                <span>Delivery</span>
                <span className="tabular-nums text-[#292722]">
                  {cart.deliveryFeeCents === 0 ? 'Complimentary' : formatEur(cart.deliveryFeeCents)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#E5DED3] font-medium text-[#292722]">
                <span>Total</span>
                <span className="tabular-nums text-base">{formatEur(cart.totalCents)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/cart"
                onClick={() => setCartDrawerOpen(false)}
                className="text-center py-3 border border-[#292722] text-xs uppercase tracking-[0.16em] text-[#292722] hover:bg-white transition-colors"
              >
                View Basket
              </Link>
              <Link
                to="/checkout"
                onClick={() => setCartDrawerOpen(false)}
                className="inline-flex items-center justify-center gap-2 py-3 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em] hover:bg-[#69462D] transition-colors"
              >
                Checkout <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
