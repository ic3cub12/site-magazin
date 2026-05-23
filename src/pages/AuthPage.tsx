import { useState, FormEvent } from "react";
import { ShoppingBag, Eye, EyeOff, Sparkles, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface AuthPageProps {
  mode: "login" | "register";
  onNavigate: (page: string) => void;
}

export default function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const { signIn, signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "register") {
      if (!fullName.trim()) { setError("Introdu numele complet."); setLoading(false); return; }
      if (password.length < 6) { setError("Parola trebuie sa aiba minim 6 caractere."); setLoading(false); return; }
      const { error: err } = await signUp(email, password, fullName);
      if (err) { setError(err); setLoading(false); return; }
    } else {
      const { error: err } = await signIn(email, password);
      if (err) {
        setError(err.includes("Invalid") ? "Email sau parola incorecte." : err);
        setLoading(false);
        return;
      }
    }

    onNavigate("home");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md">
        {/* Back */}
        <button
          onClick={() => onNavigate("home")}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Inapoi la pagina principala
        </button>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-slate-900 text-xl">PiataRO</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
            {mode === "login" ? "Bine ai revenit!" : "Creeaza cont gratuit"}
          </h1>
          <p className="text-slate-500 text-center text-sm mb-8">
            {mode === "login"
              ? "Autentifica-te pentru a accesa contul tau"
              : "Inregistreaza-te si incepe sa vinzi astazi"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Nume complet</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Ion Popescu"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@exemplu.ro"
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Parola</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "Minim 6 caractere" : "Parola ta"}
                  required
                  className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white font-semibold py-3.5 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {mode === "login" ? "Autentificare" : "Creeaza cont"}
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              {mode === "login" ? "Nu ai cont?" : "Ai deja cont?"}{" "}
              <button
                onClick={() => onNavigate(mode === "login" ? "register" : "login")}
                className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
              >
                {mode === "login" ? "Inregistreaza-te" : "Autentifica-te"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
