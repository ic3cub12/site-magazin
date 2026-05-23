import { useState } from "react";
import { ShoppingBag, Search, Plus, User, Heart, Bell, Menu, X, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export default function Navbar({ currentPage, onNavigate, searchQuery, onSearchChange }: NavbarProps) {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    onNavigate("home");
    setUserMenuOpen(false);
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur border-b border-slate-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-4">
          {/* Logo */}
          <button
            onClick={() => onNavigate("home")}
            className="flex items-center gap-2 flex-shrink-0 group"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center group-hover:bg-blue-700 transition-colors">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-lg hidden sm:block tracking-tight">TradeNest</span>
          </button>

          {/* Search */}
          <div className="flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cauta produse, masini, imobiliare..."
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onNavigate("browse")}
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:bg-slate-900 focus:border-cyan-400 transition-all"
            />
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <button
                  onClick={() => onNavigate("create")}
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Adauga anunt
                </button>
                <button
                  onClick={() => onNavigate("favorites")}
                  className={`p-2 rounded-xl transition-colors ${currentPage === "favorites" ? "bg-blue-50 text-blue-600" : "text-slate-300 hover:bg-slate-800"}`}
                >
                  <Heart className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onNavigate("messages")}
                  className={`p-2 rounded-xl transition-colors ${currentPage === "messages" ? "bg-blue-50 text-blue-600" : "text-slate-300 hover:bg-slate-800"}`}
                >
                  <Bell className="w-5 h-5" />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(v => !v)}
                    className="flex items-center gap-2 p-2 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                      <button
                        onClick={() => { onNavigate("profile"); setUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-[#eef2f7] flex items-center gap-2"
                      >
                        <User className="w-4 h-4" /> Profilul meu
                      </button>
                      <button
                        onClick={() => { onNavigate("my-listings"); setUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-[#eef2f7] flex items-center gap-2"
                      >
                        <ShoppingBag className="w-4 h-4" /> Anunturile mele
                      </button>
                      <div className="border-t border-slate-100" />
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" /> Deconectare
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => onNavigate("login")}
                  className="text-sm text-slate-300 font-medium hover:text-white px-3 py-2 rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Autentificare
                </button>
                <button
                  onClick={() => onNavigate("register")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                >
                  Inregistrare
                </button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="md:hidden p-2 rounded-xl text-slate-300 hover:bg-slate-800 transition-colors"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-4 py-4 space-y-2">
          {user ? (
            <>
              <button
                onClick={() => { onNavigate("create"); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-xl text-sm font-semibold"
              >
                <Plus className="w-4 h-4" /> Adauga anunt
              </button>
              <button onClick={() => { onNavigate("profile"); setMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-[#eef2f7] rounded-xl flex items-center gap-2">
                <User className="w-4 h-4" /> Profilul meu
              </button>
              <button onClick={() => { onNavigate("my-listings"); setMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-[#eef2f7] rounded-xl flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> Anunturile mele
              </button>
              <button onClick={() => { onNavigate("favorites"); setMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-[#eef2f7] rounded-xl flex items-center gap-2">
                <Heart className="w-4 h-4" /> Favorite
              </button>
              <button onClick={handleSignOut} className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Deconectare
              </button>
            </>
          ) : (
            <>
              <button onClick={() => { onNavigate("login"); setMenuOpen(false); }} className="w-full text-sm text-slate-700 font-medium px-4 py-3 rounded-xl hover:bg-slate-100">Autentificare</button>
              <button onClick={() => { onNavigate("register"); setMenuOpen(false); }} className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl text-sm font-semibold">Inregistrare</button>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
