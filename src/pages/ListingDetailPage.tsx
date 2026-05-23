import { useEffect, useState } from "react";
import {
  ArrowLeft, Heart, Share2, MapPin, Clock, Eye, Sparkles,
  TrendingUp, Phone, MessageSquare, ChevronLeft, ChevronRight,
  Shield, CheckCircle, User, ExternalLink
} from "lucide-react";
import { supabase, Listing } from "../lib/supabase";
import { formatPrice } from "../lib/priceCalculator";
import { getCategoryConfig, CONDITIONS } from "../lib/categories";
import { useAuth } from "../context/AuthContext";

interface ListingDetailPageProps {
  listingId: string;
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "acum";
  if (mins < 60) return `acum ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `acum ${hrs} ore`;
  return `acum ${Math.floor(hrs / 24)} zile`;
}

export default function ListingDetailPage({ listingId, onNavigate }: ListingDetailPageProps) {
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [attributes, setAttributes] = useState<{ key: string; value: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [messageText, setMessageText] = useState("");
  const [messageSent, setMessageSent] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchListing();
    if (user) checkFavorite();
  }, [listingId, user]);

  async function fetchListing() {
    setLoading(true);
    const { data } = await supabase
      .from("listings")
      .select("*, profiles(full_name, avatar_url, location, phone, created_at)")
      .eq("id", listingId)
      .maybeSingle();

    if (data) {
      setListing(data as Listing);
      // Increment views
      await supabase.from("listings").update({ views: (data.views || 0) + 1 }).eq("id", listingId);

      const { data: attrs } = await supabase
        .from("listing_attributes")
        .select("key, value")
        .eq("listing_id", listingId);
      setAttributes(attrs || []);
    }
    setLoading(false);
  }

  async function checkFavorite() {
    if (!user) return;
    const { data } = await supabase
      .from("favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("listing_id", listingId)
      .maybeSingle();
    setIsFavorite(!!data);
  }

  async function toggleFavorite() {
    if (!user) { onNavigate("login"); return; }
    if (isFavorite) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", listingId);
      setIsFavorite(false);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, listing_id: listingId });
      setIsFavorite(true);
    }
  }

  async function sendMessage() {
    if (!user || !listing || !messageText.trim()) return;
    setSendingMessage(true);
    await supabase.from("messages").insert({
      listing_id: listingId,
      sender_id: user.id,
      receiver_id: listing.user_id,
      content: messageText.trim(),
    });
    setMessageSent(true);
    setMessageText("");
    setSendingMessage(false);
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#eef2f7] pt-20">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/3" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 aspect-[4/3] bg-slate-200 rounded-2xl" />
              <div className="space-y-4">
                <div className="h-8 bg-slate-200 rounded" />
                <div className="h-24 bg-slate-200 rounded" />
                <div className="h-12 bg-slate-200 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-[#eef2f7] pt-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-500 text-lg mb-4">Anuntul nu a fost gasit.</p>
          <button onClick={() => onNavigate("home")} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold">
            Inapoi la pagina principala
          </button>
        </div>
      </div>
    );
  }

  const catConfig = getCategoryConfig(listing.category);
  const conditionConfig = CONDITIONS.find(c => c.key === listing.condition);
  const displayPrice = listing.asking_price ?? listing.ai_suggested_price;
  const isOwner = user?.id === listing.user_id;
  const images = listing.images?.length ? listing.images : [];
  const profile = listing.profiles as { full_name: string; avatar_url: string; location: string; phone: string; created_at: string } | undefined;

  const attrLabels: Record<string, string> = {
    marca: "Marca", model: "Model", an_fabricatie: "An fabricatie", an: "An",
    kilometraj: "Kilometraj", combustibil: "Combustibil", cutie_viteze: "Cutie viteze",
    putere_cp: "Putere", capacitate_cilindrica: "Capacitate", suprafata: "Suprafata",
    nr_camere: "Nr. camere", etaj: "Etaj", an_constructie: "An constructie",
    compartimentare: "Compartimentare", incalzire: "Incalzire", stocare: "Stocare",
    culoare: "Culoare", material: "Material", dimensiuni: "Dimensiuni",
    capacitate: "Capacitate", clasa_energetica: "Clasa energetica", marime: "Marime",
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Back */}
        <button
          onClick={() => onNavigate("home")}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Inapoi la anunturi
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Images + Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <div className="bg-white/90 rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              {images.length > 0 ? (
                <div className="relative">
                  <div className="aspect-[4/3] overflow-hidden bg-slate-100">
                    <img
                      src={images[currentImage]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {images.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImage(i => (i - 1 + images.length) % images.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setCurrentImage(i => (i + 1) % images.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {images.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentImage(i)}
                            className={`w-2 h-2 rounded-full transition-all ${i === currentImage ? "bg-white w-4" : "bg-white/50"}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="aspect-[4/3] bg-slate-100 flex items-center justify-center">
                  <catConfig.icon className="w-16 h-16 text-slate-200" />
                </div>
              )}

              {images.length > 1 && (
                <div className="flex gap-2 p-4 overflow-x-auto">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === currentImage ? "border-blue-500" : "border-transparent"}`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Title & Meta */}
            <div className="bg-white/90 rounded-2xl border border-slate-200/80 shadow-sm p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <h1 className="text-2xl font-bold text-slate-900 leading-tight">{listing.title}</h1>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={toggleFavorite}
                    className={`p-2.5 rounded-xl border transition-all ${isFavorite ? "bg-red-50 border-red-200 text-red-500" : "border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-400"}`}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? "fill-red-500" : ""}`} />
                  </button>
                  <button
                    onClick={copyLink}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:border-slate-300 transition-all"
                  >
                    {copied ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <Share2 className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`${catConfig.color} text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1`}>
                  <catConfig.icon className="w-3 h-3" />
                  {catConfig.label}
                  {listing.subcategory && ` › ${listing.subcategory}`}
                </span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  listing.condition === "new" ? "bg-emerald-100 text-emerald-700" :
                  listing.condition === "like_new" ? "bg-teal-100 text-teal-700" :
                  listing.condition === "good" ? "bg-blue-100 text-blue-700" :
                  listing.condition === "fair" ? "bg-amber-100 text-amber-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {conditionConfig?.label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400 mb-6">
                {listing.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {listing.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  {listing.views} vizualizari
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {timeAgo(listing.created_at)}
                </span>
              </div>

              {listing.description && (
                <div>
                  <h3 className="font-semibold text-slate-900 mb-2">Descriere</h3>
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{listing.description}</p>
                </div>
              )}
            </div>

            {/* Attributes */}
            {attributes.length > 0 && (
              <div className="bg-white/90 rounded-2xl border border-slate-200/80 shadow-sm p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Caracteristici</h3>
                <div className="grid grid-cols-2 gap-3">
                  {attributes.map(attr => (
                    <div key={attr.key} className="bg-[#eef2f7] rounded-xl p-3">
                      <p className="text-xs text-slate-400 mb-0.5">{attrLabels[attr.key] || attr.key}</p>
                      <p className="text-sm font-semibold text-slate-900">{attr.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Price Analysis */}
            {listing.ai_suggested_price && (
              <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-blue-900">Analiza Pret AI</h3>
                    <p className="text-xs text-blue-500">Media preturilor de pe multiple platforme</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-400 mb-1">Pret minim piata</p>
                    <p className="text-sm font-bold text-slate-700">{formatPrice(listing.ai_price_min!)}</p>
                  </div>
                  <div className="bg-blue-600 rounded-xl p-3 text-center">
                    <p className="text-xs text-blue-200 mb-1">Pret recomandat</p>
                    <p className="text-sm font-bold text-white">{formatPrice(listing.ai_suggested_price)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center">
                    <p className="text-xs text-slate-400 mb-1">Pret maxim piata</p>
                    <p className="text-sm font-bold text-slate-700">{formatPrice(listing.ai_price_max!)}</p>
                  </div>
                </div>

                {listing.asking_price && (
                  <div className={`flex items-center gap-2 p-3 rounded-xl text-sm mb-3 ${
                    listing.asking_price > listing.ai_price_max!
                      ? "bg-amber-50 border border-amber-200 text-amber-700"
                      : listing.asking_price < listing.ai_price_min!
                      ? "bg-blue-50 border border-blue-200 text-blue-700"
                      : "bg-emerald-50 border border-emerald-200 text-emerald-700"
                  }`}>
                    <TrendingUp className="w-4 h-4 flex-shrink-0" />
                    {listing.asking_price > listing.ai_price_max!
                      ? "Pretul vanzatorului este peste media pietei"
                      : listing.asking_price < listing.ai_price_min!
                      ? "Pret sub media pietei — oportunitate buna!"
                      : "Pretul este in intervalul corect al pietei"}
                  </div>
                )}

                {listing.ai_price_reasoning && (
                  <p className="text-xs text-blue-700 leading-relaxed">{listing.ai_price_reasoning}</p>
                )}
              </div>
            )}
          </div>

          {/* Right: Price + Contact */}
          <div className="space-y-4">
            {/* Price card */}
            <div className="bg-white/90 rounded-2xl border border-slate-200/80 shadow-sm p-6 sticky top-20">
              <div className="mb-5">
                {displayPrice ? (
                  <div>
                    <p className="text-3xl font-bold text-slate-900">{formatPrice(displayPrice)}</p>
                    {!listing.asking_price && listing.ai_suggested_price && (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full mt-1">
                        <Sparkles className="w-3 h-3" />
                        Pret recomandat AI
                      </span>
                    )}
                    {listing.ai_price_min && listing.ai_price_max && (
                      <p className="text-xs text-slate-400 mt-1">
                        Piata: {formatPrice(listing.ai_price_min)} – {formatPrice(listing.ai_price_max)}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xl font-semibold text-slate-500">Pret negociabil</p>
                )}
              </div>

              {/* Seller */}
              {profile && (
                <div className="flex items-center gap-3 pb-5 mb-5 border-b border-slate-100">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{profile.full_name || "Vanzator"}</p>
                    {profile.location && (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {profile.location}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {!isOwner && (
                <div className="space-y-3">
                  {profile?.phone && (
                    <button
                      onClick={() => setShowPhone(true)}
                      className="w-full flex items-center justify-center gap-2 border-2 border-blue-200 text-blue-700 font-semibold py-3 rounded-xl hover:bg-blue-50 transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                      {showPhone ? profile.phone : "Arata numarul"}
                    </button>
                  )}

                  {user ? (
                    messageSent ? (
                      <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3 rounded-xl flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Mesaj trimis! Vanzatorul va raspunde curand.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          value={messageText}
                          onChange={e => setMessageText(e.target.value)}
                          placeholder="Scrie un mesaj vanzatorului..."
                          rows={3}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <button
                          onClick={sendMessage}
                          disabled={!messageText.trim() || sendingMessage}
                          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40"
                        >
                          <MessageSquare className="w-4 h-4" />
                          {sendingMessage ? "Se trimite..." : "Trimite mesaj"}
                        </button>
                      </div>
                    )
                  ) : (
                    <button
                      onClick={() => onNavigate("login")}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Autentifica-te pentru a trimite mesaj
                    </button>
                  )}
                </div>
              )}

              {isOwner && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm p-3 rounded-xl text-center">
                  Acesta este anuntul tau
                </div>
              )}

              <div className="mt-4 flex items-start gap-2 text-xs text-slate-400">
                <Shield className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>Platforma verifica vanzatorii. Tranzactioneaza in siguranta.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
