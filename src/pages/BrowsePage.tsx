import { useEffect, useState } from "react";
import { SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { supabase, Listing, Category } from "../lib/supabase";
import { CATEGORIES, CONDITIONS } from "../lib/categories";
import ListingCard from "../components/ListingCard";
import { useAuth } from "../context/AuthContext";

interface BrowsePageProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
  searchQuery: string;
}

export default function BrowsePage({ onNavigate, searchQuery }: BrowsePageProps) {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category | "">("");
  const [condition, setCondition] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 16;

  useEffect(() => {
    setPage(0);
    fetchListings(0);
  }, [category, condition, minPrice, maxPrice, sortBy, searchQuery]);

  useEffect(() => {
    if (user) fetchFavorites();
  }, [user]);

  async function fetchListings(pageNum: number) {
    setLoading(true);
    let query = supabase
      .from("listings")
      .select("*, profiles(full_name, avatar_url, location)")
      .eq("status", "active");

    if (category) query = query.eq("category", category);
    if (condition) query = query.eq("condition", condition);
    if (minPrice) query = query.gte("ai_suggested_price", parseFloat(minPrice));
    if (maxPrice) query = query.lte("ai_suggested_price", parseFloat(maxPrice));
    if (searchQuery) query = query.ilike("title", `%${searchQuery}%`);

    if (sortBy === "newest") query = query.order("created_at", { ascending: false });
    else if (sortBy === "price_asc") query = query.order("ai_suggested_price", { ascending: true });
    else if (sortBy === "price_desc") query = query.order("ai_suggested_price", { ascending: false });
    else if (sortBy === "popular") query = query.order("views", { ascending: false });

    query = query.range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    const { data } = await query;
    if (pageNum === 0) setListings(data as Listing[] || []);
    else setListings(prev => [...prev, ...(data as Listing[] || [])]);
    setLoading(false);
  }

  async function fetchFavorites() {
    if (!user) return;
    const { data } = await supabase.from("favorites").select("listing_id").eq("user_id", user.id);
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

  function clearFilters() {
    setCategory("");
    setCondition("");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("newest");
  }

  const hasFilters = category || condition || minPrice || maxPrice;

  return (
    <div className="min-h-screen bg-[#eef2f7] pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {searchQuery ? `Rezultate pentru "${searchQuery}"` : "Toate anunturile"}
            </h1>
            {!loading && (
              <p className="text-slate-500 text-sm mt-1">{listings.length} anunturi gasite</p>
            )}
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${showFilters ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200 hover:border-blue-300"}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtre
            {hasFilters && <span className="w-2 h-2 rounded-full bg-blue-400 ml-0.5" />}
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs text-slate-500 font-medium mb-1.5">Categorie</label>
              <select value={category} onChange={e => setCategory(e.target.value as Category | "")} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Toate</option>
                {CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-medium mb-1.5">Stare</label>
              <select value={condition} onChange={e => setCondition(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Toate</option>
                {CONDITIONS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-medium mb-1.5">Pret minim (RON)</label>
              <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="0" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-medium mb-1.5">Pret maxim (RON)</label>
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="∞" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-slate-500 font-medium mb-1.5">Sortare</label>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="newest">Cele mai noi</option>
                <option value="price_asc">Pret crescator</option>
                <option value="price_desc">Pret descrescator</option>
                <option value="popular">Cele mai vizualizate</option>
              </select>
            </div>
            {hasFilters && (
              <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
                <button onClick={clearFilters} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition-colors">
                  <X className="w-3.5 h-3.5" />
                  Sterge filtrele
                </button>
              </div>
            )}
          </div>
        )}

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          <button onClick={() => setCategory("")} className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${!category ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
            Toate
          </button>
          {CATEGORIES.map(cat => (
            <button key={cat.key} onClick={() => setCategory(category === cat.key ? "" : cat.key as Category)} className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${category === cat.key ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}>
              <cat.icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading && listings.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white/90 rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-slate-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-6 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg mb-2">Niciun anunt gasit</p>
            <p className="text-slate-400 text-sm">Incearca sa modifici filtrele sau cauta altceva</p>
            {hasFilters && (
              <button onClick={clearFilters} className="mt-4 text-blue-600 text-sm font-medium hover:text-blue-700">
                Sterge filtrele
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {listings.map(listing => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  onView={id => onNavigate("listing", { id })}
                  isFavorite={favorites.has(listing.id)}
                  onToggleFavorite={toggleFavorite}
                />
              ))}
            </div>

            {listings.length === (page + 1) * PAGE_SIZE && (
              <div className="text-center mt-10">
                <button
                  onClick={() => {
                    const next = page + 1;
                    setPage(next);
                    fetchListings(next);
                  }}
                  className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 font-medium px-6 py-3 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-all"
                >
                  <ChevronDown className="w-4 h-4" />
                  Incarca mai multe
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
