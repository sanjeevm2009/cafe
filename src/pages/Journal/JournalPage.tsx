import { useEffect, useState } from 'react';
import { apiRequest } from '../../services/api';
import { EditorialImage } from '../../components/common/EditorialImage';
import { SeoHead } from '../../components/common/SeoHead';
import type { JournalArticle } from '../../types';

export function JournalPage() {
  const [articles, setArticles] = useState<JournalArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<JournalArticle | null>(null);

  useEffect(() => {
    apiRequest<{ articles: JournalArticle[] }>('/api/journal')
      .then((res) => setArticles(res.articles))
      .catch(() => setArticles([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-[#F8F6F1] py-16 lg:py-24">
      <SeoHead
        title="The Maison Journal – Fermentation Notes & Harvest Dispatches | MAISON CRUMB"
        description="Essays and field reports from our Parisian bakers, stone millers, and pastry directors."
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="max-w-2xl space-y-3 mb-14">
          <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">Editorial Monograph</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-[#292722]">Le Journal du Levain</h1>
          <p className="text-base text-[#81796D] leading-relaxed">
            Seasonal field reports from Touraine harvests, fermentation notes, and portraits from Rue des Martyrs.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-[#E5DED3] h-96 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {articles.map((art) => (
              <article key={art.id} className="bg-white border border-[#E5DED3] flex flex-col">
                <div className="aspect-[4/3] border-b border-[#E5DED3] overflow-hidden">
                  <EditorialImage src={art.imageUrl} alt={art.title} className="w-full h-full object-cover" />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <p className="text-xs text-[#81796D]">
                      {art.category} · {new Date(art.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    <h2 className="font-serif text-2xl text-[#292722] leading-snug">{art.title}</h2>
                    <p className="text-sm text-[#81796D] leading-relaxed">{art.excerpt}</p>
                  </div>
                  <div className="pt-4 border-t border-[#E5DED3] flex items-center justify-between">
                    <span className="text-xs text-[#69462D]">By {art.authorName}</span>
                    <button
                      type="button"
                      onClick={() => setSelected(art)}
                      className="text-xs uppercase tracking-[0.16em] text-[#292722] hover:text-[#8A6548] cursor-pointer"
                    >
                      Read Essay &rarr;
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {selected && (
          <div
            className="fixed inset-0 z-50 bg-[#292722]/50 backdrop-blur-xs flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-[#F8F6F1] border border-[#E5DED3] max-w-2xl w-full max-h-[85vh] overflow-y-auto p-8 sm:p-10 space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#8A6548]">{selected.category}</p>
                  <h2 className="font-serif text-3xl text-[#292722] mt-1">{selected.title}</h2>
                  <p className="text-xs text-[#81796D] mt-2">
                    By {selected.authorName} · {new Date(selected.publishedAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="px-3 py-1.5 border border-[#E5DED3] text-xs uppercase tracking-widest hover:bg-white cursor-pointer"
                >
                  Close
                </button>
              </div>
              <EditorialImage src={selected.imageUrl} alt={selected.title} className="w-full aspect-[16/9] object-cover border border-[#E5DED3]" />
              <p className="text-base text-[#292722] leading-[1.8]">{selected.content}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
