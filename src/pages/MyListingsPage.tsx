import { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, Eye, AlertCircle } from "lucide-react";
import { supabase, Listing } from "../lib/supabase";
import { getCategoryConfig } from "../lib/categories";
import { formatPrice } from "../lib/priceCalculator";
import { useAuth } from "../context/AuthContext";

interface MyListingsPageProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
}

export default function MyListingsPage({ onNavigate }: MyListingsPageProps) {
  const { user } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchListings();
  }, [user]);

  async function fetchListings() {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("listings")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setListings(data as Listing[] || []);
    setLoading(false);
  }

  async function deleteListing(id: string) {
    if (!confirm("Esti sigur ca vrei sa stergi acest anunt?")) return;
    setDeletingId(id);
    await supabase.from("listings").delete().eq("id", id);
    setListings(prev => prev.filter(l => l.id !== id));
    setDeletingId(null);
  }

  async function toggleStatus(listing: Listing) {
    const newStatus = listing.status === "active" ? "sold" : "active";
    await supabase.from("listings").update({ status: newStatus }).eq("id", listing.id);
    setListings(prev => prev.map(l => l.id === listing.id ? { ...l, status: newStatus } : l));
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#eef2f7] pt-20 flex items-center justify-center">
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
    <div className="min-h-screen bg-[#eef2f7] pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Anunturile mele</h1>
            <p className="text-slate-500 text-sm mt-1">{listings.length} anunturi</p>
          </div>
          <button
            onClick={() => onNavigate("create")}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Adauga anunt
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white/90 rounded-2xl border border-slate-200/80 shadow-sm p-4 animate-pulse flex gap-4">
                <div className="w-24 h-24 bg-slate-200 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-4 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 bg-white/90 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500 text-lg mb-2">Niciun anunt inca</p>
            <p className="text-slate-400 text-sm mb-6">Adauga primul tau anunt si lasa AI-ul sa calculeze pretul</p>
            <button
              onClick={() => onNavigate("create")}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Adauga primul anunt
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {listings.map(listing => {
              const cat = getCategoryConfig(listing.category);
              const displayPrice = listing.asking_price ?? listing.ai_suggested_price;
              const image = listing.images?.[0];

              return (
                <div key={listing.id} className="bg-white/90 rounded-2xl border border-slate-200/80 shadow-sm p-4 flex gap-4 hover:shadow-md transition-shadow">
                  {/* Thumbnail */}
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                    {image ? (
                      <img src={image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <cat.icon className="w-8 h-8 text-slate-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-slate-900 truncate">{listing.title}</h3>
                      <span className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${
                        listing.status === "active" ? "bg-emerald-100 text-emerald-700" :
                        listing.status === "sold" ? "bg-slate-100 text-slate-600" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {listing.status === "active" ? "Activ" : listing.status === "sold" ? "Vandut" : "Draft"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span className={`${cat.color} text-white text-xs px-2 py-0.5 rounded-full`}>{cat.label}</span>
                      {displayPrice && <span className="font-semibold text-slate-900">{formatPrice(displayPrice)}</span>}
                      <span className="flex items-center gap-1 text-xs">
                        <Eye className="w-3 h-3" />
                        {listing.views}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1">
                      Publicat {new Date(listing.created_at).toLocaleDateString("ro-RO")}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => onNavigate("listing", { id: listing.id })}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      title="Vizualizeaza"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => toggleStatus(listing)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors ${
                        listing.status === "active"
                          ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      }`}
                    >
                      {listing.status === "active" ? "Marcheaza vandut" : "Reactiveaza"}
                    </button>
                    <button
                      onClick={() => deleteListing(listing.id)}
                      disabled={deletingId === listing.id}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-40"
                      title="Sterge"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
