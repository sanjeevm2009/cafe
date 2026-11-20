import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { EditorialImage } from '../../components/common/EditorialImage';
import { SeoHead } from '../../components/common/SeoHead';

export function OurStoryPage() {
  const { cmsSections } = useApp();
  const timeline = cmsSections.timeline;
  const artisans = cmsSections.artisans;
  const charter = cmsSections.charter;

  return (
    <div className="bg-[#F8F6F1]">
      <SeoHead
        title="Our Story – MAISON CRUMB Heritage Since 1894"
        description="Four generations of Parisian sourdough bakers, Touraine stone millers, and custodians of our 1914 mother levain."
      />

      <section className="border-b border-[#E5DED3] py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">Heritage &amp; Lineage · Est. 1894</p>
            <h1 className="font-serif text-4xl sm:text-5xl text-[#292722] leading-[1.1]">
              Four Generations Tending One Living Sourdough Mother.
            </h1>
            <p className="text-base text-[#81796D] leading-relaxed">
              What began at a water-powered stone mill in Touraine became a Parisian sanctuary of unhurried breadmaking. At 42 Rue des Martyrs, our bakers still feed the same earthenware crock each morning before dawn.
            </p>
            <Link
              to="/workshops"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.16em] hover:bg-[#69462D] transition-colors"
            >
              Step Inside the Atelier <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="lg:col-span-6 aspect-[4/3] border border-[#E5DED3] overflow-hidden">
            <EditorialImage
              src="/src/assets/images/terroir_touraine_fields_1795207471777.jpg"
              alt="Touraine heirloom wheat fields at sunrise"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-[#F0EDE5] border-b border-[#E5DED3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <h2 className="font-serif text-3xl sm:text-4xl text-[#292722] mb-10">{timeline?.title || "L'Épopée du Levain"}</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
            {(timeline?.content?.milestones || []).map((m: any) => (
              <div key={m.year} className={`p-6 border ${m.highlighted ? 'bg-[#292722] text-[#F8F6F1] border-[#292722]' : 'bg-white border-[#E5DED3]'}`}>
                <span className={`font-serif text-3xl ${m.highlighted ? 'text-[#E9E3D8]' : 'text-[#8A6548]'}`}>{m.year}</span>
                <h3 className="font-serif text-xl mt-3 mb-2">{m.title}</h3>
                <p className={`text-sm leading-relaxed ${m.highlighted ? 'text-[#E9E3D8]/85' : 'text-[#81796D]'}`}>{m.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 border-b border-[#E5DED3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <h2 className="font-serif text-3xl sm:text-4xl text-[#292722] mb-10">{artisans?.title || 'Human Hands Behind Every Loaf'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {(artisans?.content?.profiles || []).map((p: any, idx: number) => (
              <div key={idx} className="bg-white border border-[#E5DED3]">
                <div className="aspect-[3/4] border-b border-[#E5DED3] overflow-hidden">
                  <EditorialImage src={p.image} alt={p.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-6 space-y-2">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8A6548]">{p.experience}</p>
                  <h3 className="font-serif text-2xl text-[#292722]">{p.name}</h3>
                  <p className="text-xs text-[#69462D] font-medium">{p.role}</p>
                  <p className="text-sm text-[#81796D] leading-relaxed pt-1">{p.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-[#F0EDE5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
          <h2 className="font-serif text-3xl sm:text-4xl text-[#292722] mb-10">{charter?.title || 'Our Ethical Charter'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(charter?.content?.principles || []).map((c: any) => (
              <div key={c.number} className="bg-white border border-[#E5DED3] p-7 space-y-2">
                <span className="font-serif text-2xl italic text-[#8A6548]">{c.number}.</span>
                <h3 className="font-serif text-2xl text-[#292722]">{c.title}</h3>
                <p className="text-sm text-[#81796D] leading-relaxed">{c.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
