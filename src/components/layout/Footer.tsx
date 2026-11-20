import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { apiRequest } from '../../services/api';

export function Footer() {
  const { cmsSections, pushToast } = useApp();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const footer = cmsSections.footer;
  const address = footer?.content?.address || '42 Rue des Martyrs, 75009 Paris, France';
  const hours = footer?.content?.hours || 'Tuesday – Sunday · 07:00 – 19:30';
  const phone = footer?.content?.phone || '+33 1 42 85 19 04';
  const contactEmail = footer?.content?.email || 'bonjour@maisoncrumb.fr';
  const description =
    footer?.description ||
    'Rooted in Touraine grain heritage and sustained by our 1914 sourdough mother. Baked daily on granite stone hearths at 42 Rue des Martyrs.';

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      setSubmitting(true);
      await apiRequest('/api/newsletter/subscribe', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setEmail('');
      pushToast('success', 'Thank you. You are subscribed to Maison Crumb seasonal letters.');
    } catch (err: any) {
      pushToast('error', err.message || 'Could not subscribe at this moment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="bg-[#292722] text-[#F8F6F1] border-t border-[#69462D]/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-16 lg:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 pb-14 border-b border-[#81796D]/30">
          {/* Brand & Newsletter */}
          <div className="lg:col-span-4 space-y-6">
            <div>
              <p className="font-serif text-3xl tracking-[0.14em] font-medium">MAISON CRUMB</p>
              <p className="text-xs uppercase tracking-[0.2em] text-[#E9E3D8]/70 mt-1">Boulangerie Artisanale · Paris</p>
            </div>
            <p className="text-sm text-[#E9E3D8]/80 leading-relaxed max-w-sm">{description}</p>
            <form onSubmit={handleSubscribe} className="pt-2">
              <label htmlFor="footer-newsletter" className="block text-xs uppercase tracking-[0.18em] text-[#E9E3D8]/70 mb-2">
                Seasonal Grain &amp; Atelier Dispatch
              </label>
              <div className="flex gap-2">
                <input
                  id="footer-newsletter"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@domain.com"
                  className="flex-1 min-w-0 bg-[#F8F6F1]/10 border border-[#81796D]/40 px-3.5 py-2.5 text-sm text-[#F8F6F1] placeholder:text-[#E9E3D8]/45 focus:outline-none focus:border-[#E9E3D8]"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2.5 bg-[#8A6548] hover:bg-[#69462D] text-[#F8F6F1] text-xs uppercase tracking-[0.14em] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Joining...' : 'Subscribe'}
                </button>
              </div>
            </form>
          </div>

          {/* Navigation */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-xs uppercase tracking-[0.2em] text-[#E9E3D8]/60 mb-4">Maison</h3>
            <ul className="space-y-2.5 text-sm text-[#E9E3D8]/85">
              <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/our-story" className="hover:text-white transition-colors">Our Story</Link></li>
              <li><Link to="/the-art-of-bread" className="hover:text-white transition-colors">The Art of Bread</Link></li>
              <li><Link to="/workshops" className="hover:text-white transition-colors">Workshops</Link></li>
              <li><Link to="/journal" className="hover:text-white transition-colors">Journal</Link></li>
            </ul>
          </div>

          {/* Product Categories */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs uppercase tracking-[0.2em] text-[#E9E3D8]/60 mb-4">Creations</h3>
            <ul className="space-y-2.5 text-sm text-[#E9E3D8]/85">
              <li><Link to="/creations?category=artisan-sourdough" className="hover:text-white transition-colors">Artisan Sourdough</Link></li>
              <li><Link to="/creations?category=traditional-baguettes" className="hover:text-white transition-colors">Traditional Baguettes</Link></li>
              <li><Link to="/creations?category=croissants" className="hover:text-white transition-colors">Croissants &amp; Viennoiserie</Link></li>
              <li><Link to="/creations?category=french-pastries" className="hover:text-white transition-colors">French Pastries</Link></li>
              <li><Link to="/creations?category=specialty-bread" className="hover:text-white transition-colors">Specialty Bread</Link></li>
              <li><Link to="/creations?category=seasonal-collections" className="hover:text-white transition-colors">Seasonal Collections</Link></li>
            </ul>
          </div>

          {/* Support & Address */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-xs uppercase tracking-[0.2em] text-[#E9E3D8]/60 mb-4">Paris Atelier &amp; Support</h3>
            <div className="space-y-2.5 text-sm text-[#E9E3D8]/85">
              <p>{address}</p>
              <p>{hours}</p>
              <p className="tabular-nums">{phone}</p>
              <p><a href={`mailto:${contactEmail}`} className="underline underline-offset-4 hover:text-white">{contactEmail}</a></p>
              <div className="pt-2 flex flex-wrap gap-4 text-xs uppercase tracking-[0.14em] text-[#E9E3D8]/70">
                <Link to="/contact" className="hover:text-white">Contact</Link>
                <Link to="/account" className="hover:text-white">My Orders</Link>
                <Link to="/admin/login" className="hover:text-white">Staff Portal</Link>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#E9E3D8]/60">
          <p>&copy; {new Date().getFullYear()} MAISON CRUMB Paris. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/privacy-policy" className="hover:text-[#F8F6F1] transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[#F8F6F1] transition-colors">Terms &amp; Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
