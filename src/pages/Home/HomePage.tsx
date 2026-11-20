import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Plus } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { apiRequest, formatEur } from '../../services/api';
import { EditorialImage } from '../../components/common/EditorialImage';
import { SeoHead } from '../../components/common/SeoHead';
import type { Product } from '../../types';

export function HomePage() {
  const { cmsSections, addToCart } = useApp();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  useEffect(() => {
    apiRequest<{ products: Product[] }>('/api/products?featured=true')
      .then((res) => setFeaturedProducts(res.products.slice(0, 6)))
      .catch(() => setFeaturedProducts([]))
      .finally(() => setLoadingFeatured(false));
  }, []);

  const hero = cmsSections.hero;
  const timeline = cmsSections.timeline;
  const terroir = cmsSections.terroir;
  const ritual = cmsSections.ritual;
  const artisans = cmsSections.artisans;
  const charter = cmsSections.charter;
  const quotation = cmsSections.quotation;
  const workshopCta = cmsSections.workshop_cta;

  const infoCards = hero?.content?.infoCards || [
    { label: 'Mother Culture', value: '110 Years Active', detail: 'Refreshed daily since 1914' },
    { label: 'Fermentation', value: '72-Hour Cold Craft', detail: 'Zero commercial dry yeast' },
    { label: 'Grain Origin', value: 'Touraine Terroir', detail: 'Stone-milled T80 & Khorasan' },
    { label: 'Hearth Baking', value: 'Granite Deck', detail: 'Caramelized blistered crust' },
  ];

  const milestones = timeline?.content?.milestones || [];
  const terroirCards = terroir?.content?.cards || [];
  const ritualSteps = ritual?.content?.steps || [];
  const artisanProfiles = artisans?.content?.profiles || [];
  const charterPrinciples = charter?.content?.principles || [];

  return (
    <div className="bg-[#F8F6F1]">
      <SeoHead
        title="MAISON CRUMB – Parisian Artisan Bakery & Sourdough Heritage"
        description="From a hundred-year-old sourdough mother to the heart of Paris. Order 72-hour naturally fermented breads and reserve Parisian breadmaking workshops."
      />

      {/* 1. HERO SECTION */}
      <section className="border-b border-[#E5DED3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            {/* Left Column */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-10">
              <div className="space-y-6">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548] font-medium">
                  {hero?.subtitle || 'MAISON CRUMB · BOULANGERIE ARTISANALE · PARIS IX'}
                </p>
                <h1 className="font-serif text-4xl sm:text-5xl lg:text-[54px] font-medium leading-[1.08] text-[#292722] text-balance">
                  {hero?.title || 'From a Hundred-Year-Old Sourdough Mother to the Heart of Paris.'}
                </h1>
                <p className="text-base text-[#81796D] leading-relaxed max-w-xl">
                  {hero?.description ||
                    'Since 1894, four generations have tended a living culture of wild yeast, cold-fermenting Touraine stone-milled grains for seventy-two unhurried hours before baking on heated granite hearths.'}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Link
                    to="/creations"
                    className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.18em] hover:bg-[#69462D] transition-colors whitespace-nowrap shrink-0"
                  >
                    Order Daily Bake <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/workshops"
                    className="inline-flex items-center gap-2 px-6 py-3.5 border border-[#E5DED3] bg-white text-[#292722] text-xs uppercase tracking-[0.18em] hover:border-[#8A6548] transition-colors whitespace-nowrap shrink-0"
                  >
                    Book a Workshop
                  </Link>
                </div>
              </div>

              {/* Four Small Information Cards */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-4">
                {infoCards.map((card: any, idx: number) => (
                  <div key={idx} className="bg-white border border-[#E5DED3] p-4 sm:p-5">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#81796D]">{card.label}</p>
                    <p className="font-serif text-xl text-[#292722] mt-1 font-medium">{card.value}</p>
                    <p className="text-xs text-[#81796D] mt-1">{card.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Large Artisan Baker Portrait + Editorial Quote Overlay */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 relative min-h-[460px] lg:min-h-[600px] border border-[#E5DED3] bg-[#E9E3D8] overflow-hidden"
            >
              <EditorialImage
                src={hero?.images?.[0] || '/src/assets/images/hero_artisan_baker_1795207471833.jpg'}
                alt="Master artisan baker dusting flour over sourdough boules at Maison Crumb Paris"
                priority
                className="w-full h-full lg:absolute lg:inset-0 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#292722]/85 via-[#292722]/25 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-[#F8F6F1]">
                <p className="font-serif italic text-xl sm:text-2xl leading-snug">
                  {hero?.content?.quoteOverlay || '« Le pain est une mémoire vivante que l’on partage chaque matin. »'}
                </p>
                <p className="text-xs uppercase tracking-[0.2em] text-[#E9E3D8] mt-3">
                  {hero?.content?.quoteAttribution || 'Laurent Duval · Maître Boulanger'}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 2. BRAND HISTORY TIMELINE */}
      <section className="py-16 lg:py-24 bg-[#F0EDE5] border-b border-[#E5DED3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="space-y-3 max-w-2xl">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">
                {timeline?.subtitle || 'OUR HERITAGE CHRONICLE'}
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-[42px] text-[#292722] leading-tight">
                {timeline?.title || "L'Épopée du Levain – A Century of Craft"}
              </h2>
            </div>
            <p className="text-sm text-[#81796D] max-w-md leading-relaxed">
              {timeline?.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {milestones.map((m: any) => (
              <article
                key={m.year}
                className={`p-6 border flex flex-col justify-between transition-colors ${
                  m.highlighted
                    ? 'bg-[#292722] text-[#F8F6F1] border-[#292722]'
                    : 'bg-white text-[#292722] border-[#E5DED3]'
                }`}
              >
                <div>
                  <span
                    className={`font-serif text-3xl font-medium tabular-nums ${
                      m.highlighted ? 'text-[#E9E3D8]' : 'text-[#8A6548]'
                    }`}
                  >
                    {m.year}
                  </span>
                  <h3 className="font-serif text-xl mt-3 mb-2 leading-snug">{m.title}</h3>
                  <p className={`text-sm leading-relaxed ${m.highlighted ? 'text-[#E9E3D8]/85' : 'text-[#81796D]'}`}>
                    {m.description}
                  </p>
                </div>
                <p
                  className={`text-[11px] uppercase tracking-[0.18em] mt-6 pt-4 border-t ${
                    m.highlighted ? 'border-[#81796D]/40 text-[#E9E3D8]' : 'border-[#E5DED3] text-[#81796D]'
                  }`}
                >
                  {m.highlighted ? 'Current Chapter' : 'Archive Milestone'}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 3. SACRED TRINITY OF PARISIAN TERROIR */}
      <section className="py-16 lg:py-24 bg-[#F8F6F1] border-b border-[#E5DED3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">
              {terroir?.subtitle || 'INGREDIENTS & ORIGINS'}
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-[42px] text-[#292722] leading-tight">
              {terroir?.title || 'The Sacred Trinity of Parisian Terroir'}
            </h2>
            <p className="text-sm text-[#81796D] leading-relaxed">{terroir?.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {terroirCards.map((card: any, idx: number) => (
              <div key={idx} className="bg-white border border-[#E5DED3] flex flex-col">
                <div className="aspect-[4/3] overflow-hidden border-b border-[#E5DED3]">
                  <EditorialImage
                    src={card.image}
                    alt={card.title}
                    className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-500"
                  />
                </div>
                <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-5">
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8A6548]">{card.origin}</p>
                    <h3 className="font-serif text-2xl text-[#292722]">{card.title}</h3>
                    <p className="text-sm text-[#81796D] leading-relaxed">{card.description}</p>
                    {Array.isArray(card.ingredients) && (
                      <p className="text-xs text-[#69462D] pt-2">
                        {card.ingredients.join(' · ')}
                      </p>
                    )}
                  </div>
                  <Link
                    to={card.relatedProductSlug ? `/creations/${card.relatedProductSlug}` : '/creations'}
                    className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-[#292722] hover:text-[#8A6548] pt-3 border-t border-[#E5DED3]"
                  >
                    Explore Related Creation <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED CREATIONS FROM LIVE CATALOG */}
      <section className="py-16 lg:py-24 bg-[#F0EDE5] border-b border-[#E5DED3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">Fresh From the Granite Hearth</p>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#292722]">Signature Creations</h2>
            </div>
            <Link
              to="/creations"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#292722] hover:text-[#8A6548] border-b border-[#292722] pb-1 w-fit"
            >
              View Full Catalogue <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-[#E5DED3] h-96 animate-pulse" />
              ))}
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="bg-white border border-[#E5DED3] p-12 text-center">
              <p className="font-serif text-2xl text-[#292722]">Morning bake is being prepared</p>
              <Link to="/creations" className="text-xs uppercase tracking-widest text-[#8A6548] underline mt-2 inline-block">
                Browse Catalogue
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProducts.map((p) => (
                <article
                  key={p.id}
                  className="bg-white border border-[#E5DED3] flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <Link to={`/creations/${p.slug}`} className="aspect-[4/3] overflow-hidden border-b border-[#E5DED3] block">
                    <EditorialImage src={p.imageUrls[0]} alt={p.name} className="w-full h-full object-cover" />
                  </Link>
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#81796D]">
                        {p.categoryName} · {p.weight}
                      </p>
                      <Link to={`/creations/${p.slug}`} className="font-serif text-2xl text-[#292722] hover:text-[#8A6548] mt-1 block">
                        {p.name}
                      </Link>
                      <p className="text-sm text-[#81796D] mt-2 line-clamp-2 leading-relaxed">{p.description}</p>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-[#E5DED3]">
                      <span className="text-base font-medium tabular-nums text-[#292722]">{formatEur(p.priceCents)}</span>
                      <button
                        type="button"
                        disabled={p.stock <= 0}
                        onClick={() => addToCart(p.id, 1)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.14em] hover:bg-[#69462D] transition-colors disabled:opacity-40 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {p.stock > 0 ? 'Add to Basket' : 'Sold Out'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 4. 72-HOUR SLOW CRAFT RITUAL */}
      <section className="py-16 lg:py-24 bg-[#F8F6F1] border-b border-[#E5DED3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="space-y-3 max-w-2xl">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">
                {ritual?.subtitle || 'METHODOLOGY OF FERMENTATION'}
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-[42px] text-[#292722] leading-tight">
                {ritual?.title || 'The 72-Hour Slow Craft Ritual'}
              </h2>
            </div>
            <Link
              to="/the-art-of-bread"
              className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#292722] hover:text-[#8A6548] border-b border-[#292722] pb-1 w-fit"
            >
              Read Fermentation Study <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {ritualSteps.map((step: any) => (
              <div key={step.step} className="bg-white border border-[#E5DED3] p-6 sm:p-7 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-[#8A6548] pb-4 border-b border-[#E5DED3]">
                    <span className="tabular-nums font-medium">Stage {step.step}</span>
                    <span>{step.duration}</span>
                  </div>
                  <h3 className="font-serif text-2xl text-[#292722] mt-5">{step.title}</h3>
                  <p className="text-sm text-[#81796D] leading-relaxed mt-3">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. HUMAN HANDS BEHIND EVERY LOAF */}
      <section className="py-16 lg:py-24 bg-[#F0EDE5] border-b border-[#E5DED3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">
              {artisans?.subtitle || 'THE MAISON CRUMB GUILD'}
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-[42px] text-[#292722]">
              {artisans?.title || 'Human Hands Behind Every Loaf'}
            </h2>
            <p className="text-sm text-[#81796D] leading-relaxed">{artisans?.description}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {artisanProfiles.map((person: any, idx: number) => (
              <article key={idx} className="bg-white border border-[#E5DED3] flex flex-col">
                <div className="aspect-[3/4] overflow-hidden border-b border-[#E5DED3]">
                  <EditorialImage src={person.image} alt={person.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-6 space-y-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8A6548]">{person.experience}</p>
                  <h3 className="font-serif text-2xl text-[#292722]">{person.name}</h3>
                  <p className="text-xs text-[#69462D] font-medium">{person.role}</p>
                  <p className="text-sm text-[#81796D] leading-relaxed pt-2">{person.bio}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 6. ETHICAL CHARTER */}
      <section className="py-16 lg:py-24 bg-[#F8F6F1] border-b border-[#E5DED3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            <div className="lg:col-span-4 space-y-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">
                {charter?.subtitle || 'FOUR UNCOMPROMISING PILLARS'}
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#292722] leading-tight">
                {charter?.title || 'Our Ethical Charter'}
              </h2>
              <p className="text-sm text-[#81796D] leading-relaxed">{charter?.description}</p>
            </div>
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
              {charterPrinciples.map((p: any) => (
                <div key={p.number} className="bg-white border border-[#E5DED3] p-6 sm:p-7 space-y-3">
                  <span className="font-serif text-2xl italic text-[#8A6548] block">{p.number}.</span>
                  <h3 className="font-serif text-xl text-[#292722]">{p.title}</h3>
                  <p className="text-sm text-[#81796D] leading-relaxed">{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. EDITORIAL QUOTATION SECTION */}
      <section className="py-20 lg:py-24 bg-[#E9E3D8] border-b border-[#E5DED3]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-5">
          <blockquote className="font-serif italic text-2xl sm:text-3xl lg:text-4xl text-[#292722] leading-relaxed text-balance">
            {quotation?.title ||
              '« Faire du pain, ce n’est pas mélanger de la farine et de l’eau ; c’est écouter le temps, respecter le grain et honorer la main qui le pétrit. »'}
          </blockquote>
          <p className="text-sm text-[#69462D] max-w-2xl mx-auto">{quotation?.description}</p>
          <p className="text-xs uppercase tracking-[0.22em] text-[#81796D] pt-2">
            {quotation?.subtitle || 'LAURENT DUVAL · RUE DES MARTYRS, PARIS'}
          </p>
        </div>
      </section>

      {/* 8. WORKSHOP CTA */}
      <section className="py-16 lg:py-24 bg-[#F8F6F1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch bg-white border border-[#E5DED3]">
            <div className="lg:col-span-7 aspect-[16/9] lg:aspect-auto overflow-hidden">
              <EditorialImage
                src={workshopCta?.images?.[0] || '/src/assets/images/workshop_atelier_hands_1795207472589.jpg'}
                alt="Hands shaping sourdough dough in the Maison Crumb Parisian workshop"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="lg:col-span-5 p-8 sm:p-12 flex flex-col justify-center space-y-6">
              <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">
                {workshopCta?.subtitle || 'PARISIAN BREADMAKING ATELIER'}
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#292722] leading-tight">
                {workshopCta?.title || 'Experience the Heritage with Your Own Hands'}
              </h2>
              <p className="text-sm text-[#81796D] leading-relaxed">{workshopCta?.description}</p>
              <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row gap-3 pt-2">
                <Link
                  to="/workshops"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em] hover:bg-[#69462D] transition-colors whitespace-nowrap shrink-0"
                >
                  {workshopCta?.content?.primaryCta || 'Reserve Your Artisan Bread Class'}
                </Link>
                <Link
                  to="/our-story"
                  className="inline-flex items-center justify-center px-6 py-3.5 border border-[#E5DED3] text-[#292722] text-xs uppercase tracking-[0.16em] hover:border-[#8A6548] transition-colors whitespace-nowrap shrink-0"
                >
                  {workshopCta?.content?.secondaryCta || 'Discover Our Heritage'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
