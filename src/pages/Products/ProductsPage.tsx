import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { apiRequest, formatEur } from '../../services/api';
import { EditorialImage } from '../../components/common/EditorialImage';
import { SeoHead } from '../../components/common/SeoHead';
import type { Category, Product } from '../../types';

export function ProductsPage() {
  const { addToCart } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCategory = searchParams.get('category') || 'all';
  const initialSearch = searchParams.get('search') || '';
  const initialSort = searchParams.get('sort') || 'popular';

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialSearch);

  useEffect(() => {
    apiRequest<{ categories: Category[] }>('/api/categories')
      .then((res) => setCategories(res.categories))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (initialCategory && initialCategory !== 'all') params.set('category', initialCategory);
    if (initialSearch) params.set('search', initialSearch);
    if (initialSort) params.set('sort', initialSort);

    apiRequest<{ products: Product[] }>(`/api/products?${params.toString()}`)
      .then((res) => setProducts(res.products))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [initialCategory, initialSearch, initialSort]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('search', searchInput.trim());
  };

  return (
    <div className="bg-[#F8F6F1] py-12 lg:py-16 min-h-[75vh]">
      <SeoHead
        title="Our Creations – Sourdough, Baguettes & Pastries | MAISON CRUMB"
        description="Shop 72-hour fermented artisan sourdough loaves, Baguettes de Tradition, cultured butter croissants, and seasonal French pastries."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 space-y-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-8 border-b border-[#E5DED3]">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">Daily Granite-Hearth Catalogue</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-[#292722]">Our Creations</h1>
            <p className="text-sm text-[#81796D] leading-relaxed">
              Every loaf and pastry is prepared without commercial dry yeast or additives. Complimentary Parisian delivery on orders over €35.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <form onSubmit={handleSearchSubmit} className="flex">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search loaves or grains..."
                className="w-56 sm:w-64 bg-white border border-[#E5DED3] px-3.5 py-2.5 text-sm text-[#292722] focus:outline-none focus:border-[#8A6548]"
              />
              <button
                type="submit"
                aria-label="Filter products"
                className="px-3.5 bg-[#292722] text-[#F8F6F1] hover:bg-[#69462D] transition-colors cursor-pointer"
              >
                <Search className="w-4 h-4" />
              </button>
            </form>
            <select
              aria-label="Sort creations"
              value={initialSort}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="bg-white border border-[#E5DED3] px-3.5 py-2.5 text-sm text-[#292722] focus:outline-none focus:border-[#8A6548]"
            >
              <option value="popular">Sort: Most Popular</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest Creations</option>
            </select>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => updateParam('category', 'all')}
            className={`px-4 py-2 text-xs uppercase tracking-[0.14em] border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              initialCategory === 'all'
                ? 'bg-[#292722] text-[#F8F6F1] border-[#292722]'
                : 'bg-white text-[#81796D] border-[#E5DED3] hover:text-[#292722]'
            }`}
          >
            All Creations
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => updateParam('category', cat.slug)}
              className={`px-4 py-2 text-xs uppercase tracking-[0.14em] border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                initialCategory === cat.slug
                  ? 'bg-[#292722] text-[#F8F6F1] border-[#292722]'
                  : 'bg-white text-[#81796D] border-[#E5DED3] hover:text-[#292722]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white border border-[#E5DED3] h-96 animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white border border-[#E5DED3] p-14 text-center space-y-4">
            <h2 className="font-serif text-3xl text-[#292722]">No creations match this selection</h2>
            <p className="text-sm text-[#81796D] max-w-md mx-auto">
              Try clearing your search filter or exploring another bread category.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setSearchParams({});
              }}
              className="px-6 py-3 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em] cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <article
                key={product.id}
                className="bg-white border border-[#E5DED3] flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
              >
                <Link to={`/creations/${product.slug}`} className="aspect-[4/3] overflow-hidden border-b border-[#E5DED3] block">
                  <EditorialImage src={product.imageUrls[0]} alt={product.name} className="w-full h-full object-cover" />
                </Link>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-[#81796D]">
                      <span>{product.categoryName} · {product.weight}</span>
                      {product.stock <= 5 && product.stock > 0 && (
                        <span className="text-[#8A6548]">Only {product.stock} left</span>
                      )}
                    </div>
                    <Link
                      to={`/creations/${product.slug}`}
                      className="font-serif text-2xl text-[#292722] hover:text-[#8A6548] mt-1.5 block leading-snug"
                    >
                      {product.name}
                    </Link>
                    <p className="text-sm text-[#81796D] mt-2 line-clamp-2 leading-relaxed">{product.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-[#E5DED3]">
                    <span className="text-base font-medium tabular-nums text-[#292722]">
                      {formatEur(product.priceCents)}
                    </span>
                    <button
                      type="button"
                      disabled={product.stock <= 0}
                      onClick={() => addToCart(product.id, 1)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.14em] hover:bg-[#69462D] transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {product.stock > 0 ? 'Add to Basket' : 'Sold Out'}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
