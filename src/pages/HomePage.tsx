import { useEffect, useState } from "react";
import { TrendingUp, Shield, Sparkles, ChevronRight, ArrowRight } from "lucide-react";
import { supabase, Listing } from "../lib/supabase";
import { CATEGORIES } from "../lib/categories";
import ListingCard from "../components/ListingCard";
import { useAuth } from "../context/AuthContext";

interface HomePageProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
  searchQuery: string;
}

export default function HomePage({ onNavigate, searchQuery }: HomePageProps) {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchListings();
  }, [activeCategory]);

  useEffect(() => {
    if (user) fetchFavorites();
  }, [user]);

  async function fetchListings() {
    setLoading(true);
    let query = supabase
      .from("listings")
      .select("*, profiles(full_name, avatar_url, location, phone)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(12);

    if (activeCategory) query = query.eq("category", activeCategory);

    const { data } = await query;
    setListings(data as Listing[] || []);
    setLoading(false);
  }

  async function fetchFavorites() {
    if (!user) return;
    const { data } = await supabase
      .from("favorites")
      .select("listing_id")
      .eq("user_id", user.id);
    setFavorites(new Set(data?.map(f => f.listing_id) || []));
  }

  async function toggleFavorite(listingId: string) {
    if (!user) { onNavigate("login"); return; }
    if (favorites.has(listingId)) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", listingId);
      setFavorites(prev => { const s = new Set(prev); s.delete(listingId); return s; });
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, listing_id: listingId });
      setFavorites(prev => new Set(prev).add(listingId));
    }
  }

  const filteredListings = searchQuery
    ? listings.filter(l =>
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.location?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : listings;

  return (
    <div className="min-h-screen bg-[#eef2f7]">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white pt-24 pb-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-sm px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            Smart global marketplace with AI pricing
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
            Buy and sell smarter
            <span className="block text-cyan-300">with AI-powered pricing</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-8">
            List cars, real estate, electronics or home goods and get an instant AI-assisted price estimate based on global market signals.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => user ? onNavigate("create") : onNavigate("register")}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              Create a free listing
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate("browse")}
              className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white font-semibold px-8 py-4 rounded-2xl transition-colors border border-white/20"
            >
              Browse listings
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Sparkles,
              color: "text-blue-600",
              bg: "bg-blue-50",
              title: "Pret calculat de AI",
              desc: "Algoritmul nostru analizeaza preturile de pe marketplaces globale si sute de alte platforme pentru a-ti oferi pretul corect.",
            },
            {
              icon: TrendingUp,
              color: "text-emerald-600",
              bg: "bg-emerald-50",
              title: "Media pietei in timp real",
              desc: "Pretul tau este comparat cu sute de anunturi similare active, astfel incat sa vinzi rapid la pretul optim.",
            },
            {
              icon: Shield,
              color: "text-amber-600",
              bg: "bg-amber-50",
              title: "Tranzactii sigure",
              desc: "Profil verificat, istoricul vanzatorului si sistem de mesagerie integrat pentru o experienta de incredere.",
            },
          ].map(f => (
            <div key={f.title} className="bg-white/90 rounded-2xl p-6 border border-slate-200/80 shadow-sm">
              <div className={`w-12 h-12 ${f.bg} rounded-xl flex items-center justify-center mb-4`}>
                <f.icon className={`w-6 h-6 ${f.color}`} />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Categorii</h2>
          <button
            onClick={() => onNavigate("browse")}
            className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors"
          >
            Vezi toate <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setActiveCategory(null)}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
              !activeCategory
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
            }`}
          >
            Toate
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(activeCategory === cat.key ? null : cat.key)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                activeCategory === cat.key
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Listings grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">
            {searchQuery ? `Rezultate pentru "${searchQuery}"` : "Anunturi recente"}
          </h2>
          <button
            onClick={() => onNavigate("browse")}
            className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:text-blue-700"
          >
            Vezi toate <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white/90 rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-slate-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 text-lg mb-2">Niciun anunt gasit</p>
            <p className="text-slate-400 text-sm mb-6">Fii primul care posteaza un anunt!</p>
            <button
              onClick={() => user ? onNavigate("create") : onNavigate("register")}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Adauga primul anunt
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredListings.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onView={id => onNavigate("listing", { id })}
                isFavorite={favorites.has(listing.id)}
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
