import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingBag, User as UserIcon, X, ShieldCheck } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { apiRequest, formatEur } from '../../services/api';
import { EditorialImage } from '../common/EditorialImage';
import type { Product } from '../../types';

export function Navbar() {
  const { user, cart, setCartDrawerOpen, searchOpen, setSearchOpen } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!searchOpen) return;
    const trimmed = searchQuery.trim();
    const timer = setTimeout(async () => {
      try {
        const res = await apiRequest<{ products: Product[] }>(
          `/api/products${trimmed ? `?search=${encodeURIComponent(trimmed)}` : '?featured=true'}`
        );
        setSuggestions(res.products.slice(0, 5));
      } catch {
        setSuggestions([]);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [searchQuery, searchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchOpen(false);
    navigate(`/creations?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const navLinks = [
    { label: 'Our Story', to: '/our-story' },
    { label: 'The Art of Bread', to: '/the-art-of-bread' },
    { label: 'Our Creations', to: '/creations' },
    { label: 'Workshops', to: '/workshops' },
    { label: 'Journal', to: '/journal' },
  ];

  const isAdminUser = user && ['super_admin', 'manager', 'staff'].includes(user.role);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#F8F6F1]/95 backdrop-blur-sm border-b border-[#E5DED3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 h-20 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line Brand Wordmark */}
          <Link
            to="/"
            className="font-serif text-2xl sm:text-[26px] font-semibold tracking-[0.14em] text-[#292722] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#8A6548]"
          >
            MAISON CRUMB
          </Link>

          {/* Zone 2: Clean single-line editorial navigation links */}
          <nav aria-label="Primary Navigation" className="hidden lg:flex items-center gap-7">
            {navLinks.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`text-sm tracking-wide transition-colors whitespace-nowrap shrink-0 py-1 border-b ${
                    active
                      ? 'text-[#292722] border-[#8A6548] font-medium'
                      : 'text-[#81796D] border-transparent hover:text-[#292722] hover:border-[#E5DED3]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: Functional actions */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search creations"
              className="p-2.5 text-[#292722] hover:text-[#8A6548] transition-colors cursor-pointer"
            >
              <Search className="w-[18px] h-[18px] stroke-[1.6]" />
            </button>

            {isAdminUser && (
              <Link
                to="/admin"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-[#69462D] hover:text-[#292722] px-2.5 py-1.5 border border-[#E5DED3] bg-[#F0EDE5] whitespace-nowrap shrink-0"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Atelier Admin
              </Link>
            )}

            <Link
              to={user ? '/account' : '/login'}
              aria-label={user ? 'My Account' : 'Sign In'}
              className="inline-flex items-center gap-2 p-2.5 text-[#292722] hover:text-[#8A6548] transition-colors whitespace-nowrap shrink-0"
            >
              <UserIcon className="w-[18px] h-[18px] stroke-[1.6]" />
              <span className="hidden md:inline text-xs tracking-wider uppercase text-[#81796D]">
                {user ? user.fullName.split(' ')[0] : 'Account'}
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setCartDrawerOpen(true)}
              aria-label={`Shopping basket (${totalItems} items)`}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-[0.14em] bg-[#292722] text-[#F8F6F1] hover:bg-[#69462D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 stroke-[1.6]" />
              <span className="tabular-nums">Basket ({totalItems})</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              className="lg:hidden p-2 text-[#292722] hover:text-[#8A6548] cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#E5DED3] bg-[#F8F6F1] px-6 py-6 space-y-4">
            <nav className="flex flex-col space-y-3">
              {navLinks.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="font-serif text-xl text-[#292722] py-1 border-b border-[#E5DED3]/60"
                >
                  {item.label}
                </Link>
              ))}
              <Link to="/contact" className="font-serif text-xl text-[#292722] py-1 border-b border-[#E5DED3]/60">
                Contact &amp; Atelier
              </Link>
              {isAdminUser && (
                <Link to="/admin" className="text-sm uppercase tracking-widest text-[#69462D] pt-2">
                  Atelier Admin Dashboard
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Search Overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#292722]/45 backdrop-blur-xs flex items-start justify-center pt-20 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Search Maison Crumb"
        >
          <div className="w-full max-w-2xl bg-[#F8F6F1] border border-[#E5DED3] p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs uppercase tracking-[0.2em] text-[#81796D]">Search the Bakehouse</span>
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
                className="p-1.5 text-[#81796D] hover:text-[#292722] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSearchSubmit} className="flex gap-3">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search sourdough, baguette, Touraine rye, croissant..."
                className="flex-1 bg-white border border-[#E5DED3] px-4 py-3 text-sm text-[#292722] placeholder:text-[#81796D] focus:outline-none focus:border-[#8A6548]"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em] hover:bg-[#69462D] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Search
              </button>
            </form>

            <div className="mt-6">
              <p className="text-xs uppercase tracking-[0.16em] text-[#81796D] mb-3">
                {searchQuery.trim() ? 'Matching Creations' : 'Morning Highlights'}
              </p>
              {suggestions.length === 0 ? (
                <p className="text-sm text-[#81796D] py-4">No loaves or pastries match "{searchQuery}".</p>
              ) : (
                <div className="divide-y divide-[#E5DED3]">
                  {suggestions.map((p) => (
                    <Link
                      key={p.id}
                      to={`/creations/${p.slug}`}
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center gap-4 py-3 hover:bg-[#F0EDE5]/60 px-2 transition-colors"
                    >
                      <EditorialImage
                        src={p.imageUrls[0]}
                        alt={p.name}
                        className="w-14 h-12 object-cover shrink-0 border border-[#E5DED3]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-serif text-lg text-[#292722] truncate">{p.name}</p>
                        <p className="text-xs text-[#81796D]">
                          {p.categoryName} · {p.weight}
                        </p>
                      </div>
                      <span className="text-sm font-medium tabular-nums text-[#69462D]">{formatEur(p.priceCents)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
