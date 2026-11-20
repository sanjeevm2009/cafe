import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, Users } from 'lucide-react';
import { apiRequest, formatEur } from '../../services/api';
import { EditorialImage } from '../../components/common/EditorialImage';
import { SeoHead } from '../../components/common/SeoHead';
import type { Workshop } from '../../types';

export function WorkshopsPage() {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ workshops: Workshop[] }>('/api/workshops')
      .then((res) => setWorkshops(res.workshops))
      .catch(() => setWorkshops([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-[#F8F6F1] py-16 lg:py-24">
      <SeoHead
        title="Artisan Breadmaking Workshops – MAISON CRUMB Paris"
        description="Reserve intimate sourdough, laminated croissant, and heritage grain workshops at our Rue des Martyrs bakery atelier."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 space-y-14">
        <div className="max-w-3xl space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">42 Rue des Martyrs · Paris Atelier</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-[#292722] leading-tight">
            Artisan Bread &amp; Viennoiserie Workshops
          </h1>
          <p className="text-base text-[#81796D] leading-relaxed">
            Work side by side with our master bakers in intimate sessions of six to ten guests. Leave with your freshly baked loaves, printed fermentation notes, and a living portion of our 1914 sourdough mother.
          </p>
        </div>

        {loading ? (
          <div className="space-y-8">
            {[1, 2].map((i) => (
              <div key={i} className="h-72 bg-white border border-[#E5DED3] animate-pulse" />
            ))}
          </div>
        ) : workshops.length === 0 ? (
          <div className="bg-white border border-[#E5DED3] p-12 text-center">
            <h2 className="font-serif text-2xl text-[#292722]">No workshops scheduled right now</h2>
            <p className="text-sm text-[#81796D] mt-2">Please check back soon or contact our Paris atelier for private classes.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {workshops.map((ws) => {
              const openSlots = (ws.slots || []).filter((s) => s.status === 'open' && s.bookedParticipants < s.maximumParticipants);
              const totalRemaining = openSlots.reduce((acc, s) => acc + (s.maximumParticipants - s.bookedParticipants), 0);

              return (
                <article key={ws.id} className="bg-white border border-[#E5DED3] grid grid-cols-1 lg:grid-cols-12 items-stretch">
                  <div className="lg:col-span-5 aspect-[4/3] lg:aspect-auto overflow-hidden border-b lg:border-b-0 lg:border-r border-[#E5DED3]">
                    <EditorialImage src={ws.imageUrls[0]} alt={ws.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between space-y-6">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.16em] text-[#81796D]">
                        <span className="inline-flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-[#8A6548]" /> {ws.duration}</span>
                        <span>·</span>
                        <span>{ws.level}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-[#8A6548]" /> {totalRemaining} seats open across {openSlots.length} session(s)</span>
                      </div>
                      <h2 className="font-serif text-3xl text-[#292722]">{ws.title}</h2>
                      <p className="text-sm text-[#81796D] leading-relaxed">{ws.description}</p>
                    </div>

                    <div className="pt-5 border-t border-[#E5DED3] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs uppercase tracking-[0.16em] text-[#81796D] block">Per Participant</span>
                        <span className="text-2xl font-medium tabular-nums text-[#292722]">{formatEur(ws.priceCents)}</span>
                      </div>
                      <Link
                        to={`/workshops/${ws.slug}`}
                        className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.18em] hover:bg-[#69462D] transition-colors whitespace-nowrap shrink-0"
                      >
                        <Calendar className="w-4 h-4" /> Select Date &amp; Reserve <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
