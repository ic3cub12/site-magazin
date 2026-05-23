import { useState } from "react";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import AuthPage from "./pages/AuthPage";
import CreateListingPage from "./pages/CreateListingPage";
import ListingDetailPage from "./pages/ListingDetailPage";
import BrowsePage from "./pages/BrowsePage";
import MyListingsPage from "./pages/MyListingsPage";
import FavoritesPage from "./pages/FavoritesPage";

interface NavState {
  page: string;
  data?: Record<string, unknown>;
}

export default function App() {
  const [nav, setNav] = useState<NavState>({ page: "home" });
  const [searchQuery, setSearchQuery] = useState("");

  function navigate(page: string, data?: Record<string, unknown>) {
    setNav({ page, data });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSearchChange(q: string) {
    setSearchQuery(q);
    if (nav.page !== "browse" && q) {
      navigate("browse");
    }
  }

  return (
    <AuthProvider>
      <div className="font-sans antialiased">
        <Navbar
          currentPage={nav.page}
          onNavigate={navigate}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
        />

        {nav.page === "home" && (
          <HomePage onNavigate={navigate} searchQuery={searchQuery} />
        )}
        {nav.page === "browse" && (
          <BrowsePage onNavigate={navigate} searchQuery={searchQuery} />
        )}
        {nav.page === "login" && (
          <AuthPage mode="login" onNavigate={navigate} />
        )}
        {nav.page === "register" && (
          <AuthPage mode="register" onNavigate={navigate} />
        )}
        {nav.page === "create" && (
          <CreateListingPage onNavigate={navigate} />
        )}
        {nav.page === "listing" && nav.data?.id && (
          <ListingDetailPage listingId={nav.data.id as string} onNavigate={navigate} />
        )}
        {nav.page === "my-listings" && (
          <MyListingsPage onNavigate={navigate} />
        )}
        {nav.page === "favorites" && (
          <FavoritesPage onNavigate={navigate} />
        )}
      </div>
    </AuthProvider>
  );
}
