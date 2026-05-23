import { useState, useRef, FormEvent } from "react";
import {
  ArrowLeft, Sparkles, Upload, X, Plus, Loader2,
  TrendingUp, Info, CheckCircle, ChevronDown, ChevronUp
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { Category, Condition } from "../lib/supabase";
import { CATEGORIES, CONDITIONS, getCategoryConfig } from "../lib/categories";
import { calculateAIPrice, formatPrice, PriceResult } from "../lib/priceCalculator";
import { useAuth } from "../context/AuthContext";

interface CreateListingPageProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
}

export default function CreateListingPage({ onNavigate }: CreateListingPageProps) {
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("other");
  const [subcategory, setSubcategory] = useState("");
  const [condition, setCondition] = useState<Condition>("good");
  const [location, setLocation] = useState("");
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [images, setImages] = useState<string[]>([]);
  const [askingPrice, setAskingPrice] = useState<string>("");
  const [useAIPrice, setUseAIPrice] = useState(true);
  const [aiResult, setAiResult] = useState<PriceResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [showSourcesExpanded, setShowSourcesExpanded] = useState(false);

  const catConfig = getCategoryConfig(category);

  function handleAttributeChange(key: string, value: string) {
    setAttributes(prev => ({ ...prev, [key]: value }));
  }

  async function handleCalculatePrice() {
    if (!title || !category || !condition) return;
    setCalculating(true);
    setAiError("");
    try {
      const result = await calculateAIPrice({
        title,
        description,
        category,
        subcategory,
        condition,
        attributes,
      });
      setAiResult(result);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Eroare la calcularea pretului");
    } finally {
      setCalculating(false);
    }
  }

  function addImageUrl() {
  const url = imageUrl.trim();

  if (url && images.length < 10) {
    setImages(prev => [...prev, url]);
    setImageUrl("");
  }
}

async function uploadImage(file: File) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${user?.id}/${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage
    .from("listing-images")
    .upload(fileName, file);

  if (error) {
    console.error(error);
    return;
  }

  const { data } = supabase.storage
    .from("listing-images")
    .getPublicUrl(fileName);

  setImages(prev => [...prev, data.publicUrl]);
}

async function handleSubmit(e: FormEvent) {
  e.preventDefault();

  if (!user) return;

  setSubmitting(true);

  const finalPrice = useAIPrice
    ? null
    : (askingPrice ? parseFloat(askingPrice) : null);

  const { data, error } = await supabase
    .from("listings")
    .insert({
      user_id: user.id,
      title,
      description,
      category,
      subcategory,
      condition,
      asking_price: finalPrice,
      ai_suggested_price: aiResult?.suggested_price ?? null,
      ai_price_min: aiResult?.price_min ?? null,
      ai_price_max: aiResult?.price_max ?? null,
      ai_price_reasoning: aiResult?.reasoning ?? "",
      ai_price_updated_at: aiResult ? new Date().toISOString() : null,
      images,
      location,
      status: "active",
    })
    .select()
    .single();

  if (error) {
    console.error(error);
    setSubmitting(false);
    return;
  }

  // Insert attributes
  if (Object.keys(attributes).length > 0) {
    const attrRows = Object.entries(attributes)
      .filter(([, v]) => v.trim())
      .map(([key, value]) => ({
        listing_id: data.id,
        key,
        value,
      }));

    if (attrRows.length > 0) {
      await supabase
        .from("listing_attributes")
        .insert(attrRows);
    }
  }

  onNavigate("listing", { id: data.id });
}

  const isStep1Valid = title.length >= 5 && category && subcategory;
  const isStep2Valid = condition;
  const isStep3Valid = true;

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-16">
      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : onNavigate("home")}
            className="p-2 rounded-xl hover:bg-slate-200 transition-colors text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Adauga anunt</h1>
            <p className="text-slate-500 text-sm">Pasul {step} din 4</p>
          </div>
        </div>

        {/* Steps progress */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex-1 flex items-center gap-2">
              <div className={`flex-1 h-1.5 rounded-full transition-all ${s <= step ? "bg-blue-600" : "bg-slate-200"}`} />
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic info */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-5">
                <h2 className="font-bold text-slate-900 text-lg">Informatii de baza</h2>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Titlu anunt *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="ex: iPhone 14 Pro 256GB, Negru, Stare excelenta"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    maxLength={120}
                  />
                  <p className="text-xs text-slate-400 mt-1">{title.length}/120 caractere</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Categorie *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => { setCategory(cat.key as Category); setSubcategory(""); setAttributes({}); }}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-xs font-medium transition-all ${
                          category === cat.key
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
                        }`}
                      >
                        <cat.icon className="w-5 h-5" />
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Subcategorie *</label>
                  <select
                    value={subcategory}
                    onChange={e => setSubcategory(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white"
                  >
                    <option value="">Selecteaza subcategoria</option>
                    {catConfig.subcategories.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Descriere</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                    placeholder="Descrie produsul in detaliu: stare, defecte, accesorii incluse, motiv vanzare..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                    maxLength={2000}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Locatie</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="ex: Bucuresti, Sector 3"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!isStep1Valid}
                className="w-full bg-blue-600 text-white font-semibold py-4 rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continua
              </button>
            </div>
          )}

          {/* Step 2: Condition & Attributes */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-5">
                <h2 className="font-bold text-slate-900 text-lg">Stare si caracteristici</h2>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Stare produs *</label>
                  <div className="space-y-2">
                    {CONDITIONS.map(cond => (
                      <button
                        key={cond.key}
                        type="button"
                        onClick={() => setCondition(cond.key as Condition)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                          condition === cond.key
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-200 hover:border-blue-300"
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          condition === cond.key ? "border-blue-500" : "border-slate-300"
                        }`}>
                          {condition === cond.key && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${condition === cond.key ? "text-blue-700" : "text-slate-900"}`}>{cond.label}</p>
                          <p className="text-xs text-slate-500">{cond.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {catConfig.attributes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Caracteristici specifice
                      <span className="ml-1 text-slate-400 font-normal">(recomandat pentru un pret mai precis)</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {catConfig.attributes.map(attr => (
                        <div key={attr.key}>
                          <label className="block text-xs text-slate-500 mb-1">{attr.label}</label>
                          {attr.type === "select" ? (
                            <select
                              value={attributes[attr.key] || ""}
                              onChange={e => handleAttributeChange(attr.key, e.target.value)}
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                              <option value="">Selecteaza</option>
                              {attr.options?.map(o => <option key={o} value={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input
                              type={attr.type}
                              value={attributes[attr.key] || ""}
                              onChange={e => handleAttributeChange(attr.key, e.target.value)}
                              placeholder={attr.placeholder}
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)} className="flex-1 bg-white border border-slate-200 text-slate-700 font-semibold py-4 rounded-2xl hover:bg-slate-50 transition-colors">
                  Inapoi
                </button>
                <button type="button" onClick={() => setStep(3)} disabled={!isStep2Valid} className="flex-1 bg-blue-600 text-white font-semibold py-4 rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-40">
                  Continua
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Photos */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-5">
                <h2 className="font-bold text-slate-900 text-lg">Fotografii</h2>
                <p className="text-sm text-slate-500">Adauga link-uri catre fotografii ale produsului (max 10 imagini).</p>

                <div className="flex gap-2">
                  <input
  type="file"
  accept="image/*"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) uploadImage(file);
  }}
/>
                  <button
                    type="button"
                    onClick={addImageUrl}
                    disabled={!imageUrl.trim() || images.length >= 10}
                    className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100 group">
                        <img src={img} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src = "https://images.pexels.com/photos/416160/pexels-photo-416160.jpeg?w=200"; }} />
                        <button
                          type="button"
                          onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                        {idx === 0 && (
                          <span className="absolute bottom-1 left-1 text-xs bg-black/50 text-white px-1.5 py-0.5 rounded">Principala</span>
                        )}
                      </div>
                    ))}
                    {images.length < 10 && (
                      <div className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 text-xs gap-1">
                        <Upload className="w-5 h-5" />
                        Adauga
                      </div>
                    )}
                  </div>
                )}

                {images.length === 0 && (
                  <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center">
                    <Upload className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Nicio fotografie adaugata</p>
                    <p className="text-xs text-slate-300 mt-1">Anunturile cu fotografii se vand de 3x mai repede</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(2)} className="flex-1 bg-white border border-slate-200 text-slate-700 font-semibold py-4 rounded-2xl hover:bg-slate-50 transition-colors">
                  Inapoi
                </button>
                <button type="button" onClick={() => setStep(4)} className="flex-1 bg-blue-600 text-white font-semibold py-4 rounded-2xl hover:bg-blue-700 transition-colors">
                  Continua
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Price */}
          {step === 4 && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-5">
                <h2 className="font-bold text-slate-900 text-lg">Stabileste pretul</h2>

                {/* AI Price calculator */}
                <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-200 rounded-2xl p-5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-900 text-sm">Calculator Pret AI</h3>
                      <p className="text-blue-600 text-xs mt-0.5">
                        Analizeaza preturile de pe OLX, AutoVit, Storia, eMag si alte platforme
                      </p>
                    </div>
                  </div>

                  {!aiResult ? (
                    <>
                      {aiError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-xl mb-3">
                          {aiError}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleCalculatePrice}
                        disabled={calculating || !title || !category || !condition}
                        className="w-full bg-blue-600 text-white font-semibold py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                      >
                        {calculating ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Se calculeaza pretul...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Calculeaza pretul recomandat
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-blue-600 font-medium">Pret recomandat AI</p>
                          <p className="text-3xl font-bold text-blue-900">{formatPrice(aiResult.suggested_price)}</p>
                          <p className="text-xs text-blue-500 mt-0.5">
                            Interval: {formatPrice(aiResult.price_min)} — {formatPrice(aiResult.price_max)}
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          aiResult.confidence === "high" ? "bg-emerald-100 text-emerald-700" :
                          aiResult.confidence === "medium" ? "bg-amber-100 text-amber-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          Incredere {aiResult.confidence === "high" ? "ridicata" : aiResult.confidence === "medium" ? "medie" : "scazuta"}
                        </div>
                      </div>

                      <div className="bg-white/70 rounded-xl p-3">
                        <p className="text-xs text-blue-800 leading-relaxed">{aiResult.reasoning}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowSourcesExpanded(v => !v)}
                        className="flex items-center gap-1 text-xs text-blue-600 font-medium"
                      >
                        <TrendingUp className="w-3 h-3" />
                        Surse date ({aiResult.market_sources.length})
                        {showSourcesExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {showSourcesExpanded && (
                        <div className="flex flex-wrap gap-1.5">
                          {aiResult.market_sources.map(s => (
                            <span key={s} className="bg-white border border-blue-200 text-blue-700 text-xs px-2 py-1 rounded-full">{s}</span>
                          ))}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setAiResult(null)}
                        className="text-xs text-blue-500 underline"
                      >
                        Recalculeaza
                      </button>
                    </div>
                  )}
                </div>

                {/* Price option */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-3">Optiune pret</label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setUseAIPrice(true)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                        useAIPrice ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${useAIPrice ? "border-blue-500" : "border-slate-300"}`}>
                        {useAIPrice && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${useAIPrice ? "text-blue-700" : "text-slate-900"}`}>
                          Foloseste pretul AI {aiResult ? `(${formatPrice(aiResult.suggested_price)})` : ""}
                        </p>
                        <p className="text-xs text-slate-500">Pretul optim calculat pe baza pietei</p>
                      </div>
                      {aiResult && <CheckCircle className="w-4 h-4 text-blue-500 ml-auto" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setUseAIPrice(false)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                        !useAIPrice ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${!useAIPrice ? "border-blue-500" : "border-slate-300"}`}>
                        {!useAIPrice && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                      </div>
                      <p className={`text-sm font-semibold ${!useAIPrice ? "text-blue-700" : "text-slate-900"}`}>
                        Stabilesc eu pretul
                      </p>
                    </button>
                  </div>
                </div>

                {!useAIPrice && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Pretul tau (RON)</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={askingPrice}
                        onChange={e => setAskingPrice(e.target.value)}
                        placeholder="0"
                        min="1"
                        className="w-full px-4 py-3 pr-16 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">RON</span>
                    </div>
                    {aiResult && askingPrice && (
                      <div className={`flex items-center gap-1.5 mt-2 text-xs ${
                        parseFloat(askingPrice) > aiResult.price_max ? "text-amber-600" :
                        parseFloat(askingPrice) < aiResult.price_min ? "text-amber-600" :
                        "text-emerald-600"
                      }`}>
                        <Info className="w-3 h-3" />
                        {parseFloat(askingPrice) > aiResult.price_max
                          ? `Pretul tau este peste media pietei (${formatPrice(aiResult.price_max)})`
                          : parseFloat(askingPrice) < aiResult.price_min
                          ? `Pretul tau este sub media pietei (${formatPrice(aiResult.price_min)})`
                          : "Pretul tau este in intervalul recomandat de piata"}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200">
                <h3 className="font-bold text-slate-900 mb-4">Sumar anunt</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Titlu</span>
                    <span className="text-slate-900 font-medium text-right max-w-[200px] truncate">{title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Categorie</span>
                    <span className="text-slate-900 font-medium">{catConfig.label} › {subcategory}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Stare</span>
                    <span className="text-slate-900 font-medium">{CONDITIONS.find(c => c.key === condition)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Fotografii</span>
                    <span className="text-slate-900 font-medium">{images.length} imagini</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pret afisat</span>
                    <span className="text-blue-600 font-bold">
                      {useAIPrice
                        ? (aiResult ? formatPrice(aiResult.suggested_price) + " (AI)" : "Se calculeaza...")
                        : (askingPrice ? formatPrice(parseFloat(askingPrice)) : "Negociabil")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(3)} className="flex-1 bg-white border border-slate-200 text-slate-700 font-semibold py-4 rounded-2xl hover:bg-slate-50 transition-colors">
                  Inapoi
                </button>
                <button
                  type="submit"
                  disabled={submitting || (useAIPrice && !aiResult)}
                  className="flex-1 bg-blue-600 text-white font-semibold py-4 rounded-2xl hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                  {submitting ? "Se publica..." : "Publica anuntul"}
                </button>
              </div>

              {useAIPrice && !aiResult && (
                <p className="text-center text-xs text-amber-600 flex items-center justify-center gap-1">
                  <Info className="w-3 h-3" />
                  Trebuie sa calculezi pretul AI inainte de a publica
                </p>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
