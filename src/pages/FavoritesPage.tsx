import { useEffect, useState } from "react";
import { Heart, AlertCircle } from "lucide-react";
import { supabase, Listing } from "../lib/supabase";
import ListingCard from "../components/ListingCard";
import { useAuth } from "../context/AuthContext";

interface FavoritesPageProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
}

export default function FavoritesPage({ onNavigate }: FavoritesPageProps) {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchFavorites();
  }, [user]);

  async function fetchFavorites() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("favorites")
      .select("listing_id, listings(*, profiles(full_name, avatar_url, location))")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const favListings = data?.map((f: { listing_id: string; listings: unknown }) => f.listings).filter(Boolean) as Listing[];
    setListings(favListings || []);
    setLoading(false);
  }

  async function removeFavorite(listingId: string) {
    if (!user) return;
    await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", listingId);
    setListings(prev => prev.filter(l => l.id !== listingId));
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 mb-4">Trebuie sa fii autentificat</p>
          <button onClick={() => onNavigate("login")} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold">
            Autentificare
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Anunturi favorite</h1>
            <p className="text-slate-500 text-sm">{listings.length} anunturi salvate</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
                <div className="aspect-[4/3] bg-slate-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-6 bg-slate-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-slate-200">
            <Heart className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 text-lg mb-2">Niciun anunt salvat</p>
            <p className="text-slate-400 text-sm mb-6">Apasa pe inima pentru a salva anunturi</p>
            <button
              onClick={() => onNavigate("browse")}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Cauta anunturi
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map(listing => (
              <ListingCard
                key={listing.id}
                listing={listing}
                onView={id => onNavigate("listing", { id })}
                isFavorite={true}
                onToggleFavorite={removeFavorite}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
