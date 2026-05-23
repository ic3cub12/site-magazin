import { Heart, MapPin, Eye, Sparkles, Clock } from "lucide-react";
import { Listing } from "../lib/supabase";
import { formatPrice } from "../lib/priceCalculator";
import { getCategoryConfig } from "../lib/categories";

interface ListingCardProps {
  listing: Listing;
  onView: (id: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "acum cateva secunde";
  if (mins < 60) return `acum ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `acum ${hrs} ore`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `acum ${days} zile`;
  return new Date(dateStr).toLocaleDateString("ro-RO");
}

export default function ListingCard({ listing, onView, isFavorite, onToggleFavorite }: ListingCardProps) {
  const cat = getCategoryConfig(listing.category);
  const displayPrice = listing.asking_price ?? listing.ai_suggested_price;
  const isAIPrice = !listing.asking_price && listing.ai_suggested_price;
  const image = listing.images?.[0];

  return (
    <div
      onClick={() => onView(listing.id)}
      className="group bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        {image ? (
          <img
            src={image}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <cat.icon className="w-12 h-12 text-slate-300" />
          </div>
        )}

        {/* Category badge */}
        <div className={`absolute top-3 left-3 ${cat.color} text-white text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1`}>
          <cat.icon className="w-3 h-3" />
          {cat.label}
        </div>

        {/* Favorite button */}
        {onToggleFavorite && (
          <button
            onClick={e => { e.stopPropagation(); onToggleFavorite(listing.id); }}
            className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-white transition-colors"
          >
            <Heart className={`w-4 h-4 ${isFavorite ? "fill-red-500 text-red-500" : "text-slate-400"}`} />
          </button>
        )}

        {/* Condition */}
        <div className="absolute bottom-3 left-3">
          <span className={`text-xs font-medium px-2 py-1 rounded-lg ${
            listing.condition === "new" ? "bg-emerald-500 text-white" :
            listing.condition === "like_new" ? "bg-teal-500 text-white" :
            listing.condition === "good" ? "bg-blue-500 text-white" :
            listing.condition === "fair" ? "bg-amber-500 text-white" :
            "bg-slate-500 text-white"
          }`}>
            {listing.condition === "new" ? "Nou" :
             listing.condition === "like_new" ? "Ca nou" :
             listing.condition === "good" ? "Stare buna" :
             listing.condition === "fair" ? "Acceptabil" : "Uzat"}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
          {listing.title}
        </h3>

        {/* Price */}
        <div className="mb-3">
          {displayPrice ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-bold text-slate-900">{formatPrice(displayPrice)}</span>
              {isAIPrice && (
                <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                  <Sparkles className="w-3 h-3" />
                  Pret AI
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-slate-400 italic">Pret negociabil</span>
          )}
          {listing.ai_price_min && listing.ai_price_max && (
            <p className="text-xs text-slate-400 mt-0.5">
              Piata: {formatPrice(listing.ai_price_min)} – {formatPrice(listing.ai_price_max)}
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1 min-w-0">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{listing.location || "Romania"}</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {listing.views}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeAgo(listing.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
