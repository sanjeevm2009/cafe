import { Link } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import { EditorialImage } from '../../components/common/EditorialImage';
import { SeoHead } from '../../components/common/SeoHead';

export function ArtOfBreadPage() {
  const { cmsSections } = useApp();
  const ritual = cmsSections.ritual;
  const terroir = cmsSections.terroir;

  return (
    <div className="bg-[#F8F6F1]">
      <SeoHead
        title="The Art of Bread – 72-Hour Fermentation & Touraine Terroir | MAISON CRUMB"
        description="Learn our 72-hour cold sourdough fermentation ritual, stone-milled Touraine flours, and granite-deck baking craft."
      />

      <section className="py-16 lg:py-24 border-b border-[#E5DED3]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-5">
          <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">Savoir-Faire &amp; Fermentation</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-[#292722] leading-tight">
            {ritual?.title || 'The 72-Hour Slow Craft Ritual'}
          </h1>
          <p className="text-base text-[#81796D] leading-relaxed">{ritual?.description}</p>
        </div>
      </section>

      <section className="py-16 bg-[#F0EDE5] border-b border-[#E5DED3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(ritual?.content?.steps || []).map((step: any) => (
            <div key={step.step} className="bg-white border border-[#E5DED3] p-7 space-y-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-[#8A6548] pb-3 border-b border-[#E5DED3]">
                <span>Stage {step.step}</span>
                <span>{step.duration}</span>
              </div>
              <h2 className="font-serif text-2xl text-[#292722]">{step.title}</h2>
              <p className="text-sm text-[#81796D] leading-relaxed">{step.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 space-y-12">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">Three Elements</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#292722]">{terroir?.title || 'The Sacred Trinity of Parisian Terroir'}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(terroir?.content?.cards || []).map((card: any, idx: number) => (
              <div key={idx} className="bg-white border border-[#E5DED3] flex flex-col">
                <div className="aspect-[4/3] border-b border-[#E5DED3] overflow-hidden">
                  <EditorialImage src={card.image} alt={card.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#8A6548]">{card.origin}</p>
                    <h3 className="font-serif text-2xl text-[#292722] mt-1">{card.title}</h3>
                    <p className="text-sm text-[#81796D] leading-relaxed mt-2">{card.description}</p>
                  </div>
                  <Link
                    to={card.relatedProductSlug ? `/creations/${card.relatedProductSlug}` : '/creations'}
                    className="text-xs uppercase tracking-[0.16em] text-[#292722] hover:text-[#8A6548] pt-3 border-t border-[#E5DED3]"
                  >
                    Taste This Terroir &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
