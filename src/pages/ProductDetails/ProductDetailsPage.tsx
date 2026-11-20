import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { apiRequest, formatEur } from '../../services/api';
import { EditorialImage } from '../../components/common/EditorialImage';
import { SeoHead } from '../../components/common/SeoHead';
import type { Product } from '../../types';

export function ProductDetailsPage() {
  const { slug } = useParams();
  const { addToCart } = useApp();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setQuantity(1);
    apiRequest<{ product: Product; relatedProducts: Product[] }>(`/api/products/${encodeURIComponent(slug)}`)
      .then((res) => {
        setProduct(res.product);
        setRelated(res.relatedProducts);
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16">
        <div className="h-96 bg-white border border-[#E5DED3] animate-pulse" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="font-serif text-4xl text-[#292722]">Creation Not Found</h1>
        <p className="text-sm text-[#81796D]">This seasonal loaf may no longer be in today’s bake.</p>
        <Link to="/creations" className="inline-block px-6 py-3 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em]">
          Return to Creations
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#F8F6F1] py-12 lg:py-16">
      <SeoHead
        title={`${product.name} – MAISON CRUMB Paris`}
        description={product.description.slice(0, 155)}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 space-y-16">
        <Link
          to="/creations"
          className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#81796D] hover:text-[#292722]"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Creations
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Photography */}
          <div className="lg:col-span-7 bg-white border border-[#E5DED3] overflow-hidden">
            <EditorialImage
              src={product.imageUrls[0]}
              alt={product.name}
              priority
              className="w-full aspect-[4/3] object-cover"
            />
          </div>

          {/* Contiguous Purchase Module */}
          <div className="lg:col-span-5 bg-white border border-[#E5DED3] p-8 space-y-6">
            <div className="space-y-2 pb-5 border-b border-[#E5DED3]">
              <p className="text-xs uppercase tracking-[0.18em] text-[#8A6548]">
                {product.categoryName} · {product.weight}
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl text-[#292722] leading-tight">{product.name}</h1>
              <div className="flex items-baseline justify-between pt-2">
                <span className="text-2xl font-medium tabular-nums text-[#292722]">{formatEur(product.priceCents)}</span>
                <span className="text-xs uppercase tracking-[0.14em] text-[#69462D]">
                  {product.stock > 0 ? `${product.stock} available today` : 'Sold out for today'}
                </span>
              </div>
            </div>

            <p className="text-sm text-[#81796D] leading-relaxed">{product.description}</p>

            {/* Purchase Controls */}
            <div className="flex items-center gap-3 pt-2">
              <div className="inline-flex items-center border border-[#E5DED3]">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Decrease quantity"
                  className="p-3 text-[#292722] hover:bg-[#F0EDE5] cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 text-sm font-medium tabular-nums">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(Math.max(1, product.stock), q + 1))}
                  aria-label="Increase quantity"
                  className="p-3 text-[#292722] hover:bg-[#F0EDE5] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                disabled={product.stock <= 0}
                onClick={() => addToCart(product.id, quantity)}
                className="flex-1 py-3.5 px-6 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.18em] hover:bg-[#69462D] transition-colors disabled:opacity-40 cursor-pointer"
              >
                {product.stock > 0 ? 'Add to Basket' : 'Sold Out'}
              </button>
            </div>

            {/* Ingredients & Allergens */}
            <div className="pt-5 border-t border-[#E5DED3] space-y-4 text-sm">
              <div>
                <h2 className="text-xs uppercase tracking-[0.18em] text-[#81796D] mb-1.5">Ingredients</h2>
                <p className="text-[#292722] leading-relaxed">{product.ingredients.join(' · ')}</p>
              </div>
              <div>
                <h2 className="text-xs uppercase tracking-[0.18em] text-[#81796D] mb-1.5">Allergens</h2>
                <p className="text-[#69462D]">
                  {product.allergens.length > 0 ? product.allergens.join(' · ') : 'None declared'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <section className="pt-12 border-t border-[#E5DED3] space-y-8">
            <h2 className="font-serif text-3xl text-[#292722]">Pair With From the Bakehouse</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {related.map((r) => (
                <Link key={r.id} to={`/creations/${r.slug}`} className="bg-white border border-[#E5DED3] group block">
                  <div className="aspect-[4/3] border-b border-[#E5DED3] overflow-hidden">
                    <EditorialImage src={r.imageUrls[0]} alt={r.name} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform" />
                  </div>
                  <div className="p-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-[#81796D]">{r.weight}</p>
                      <h3 className="font-serif text-xl text-[#292722]">{r.name}</h3>
                    </div>
                    <span className="text-sm font-medium tabular-nums text-[#292722]">{formatEur(r.priceCents)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
