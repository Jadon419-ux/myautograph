import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import BrandAccent from "./components/BrandAccent.jsx";
import Footer from "./components/Footer.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Celebrities from "./pages/Celebrities.jsx";
import CelebrityProfile from "./pages/CelebrityProfile.jsx";
import Concerts from "./pages/Concerts.jsx";
import ConcertDetail from "./pages/ConcertDetail.jsx";
import PaystackCallback from "./pages/PaystackCallback.jsx";
import VerifyAutograph from "./pages/VerifyAutograph.jsx";
import Marketplace from "./pages/Marketplace.jsx";
import ListingDetail from "./pages/ListingDetail.jsx";
import Community from "./pages/Community.jsx";
import PostDetail from "./pages/PostDetail.jsx";
import Dashboard from "./pages/Dashboard.jsx";

export default function App() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <BrandAccent />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/celebrities" element={<Celebrities />} />
          <Route path="/celebrities/:id" element={<CelebrityProfile />} />
          <Route path="/concerts" element={<Concerts />} />
          <Route path="/concerts/:id" element={<ConcertDetail />} />
          <Route path="/payments/callback" element={<PaystackCallback />} />
          <Route path="/verify" element={<VerifyAutograph />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/marketplace/:id" element={<ListingDetail />} />
          <Route
            path="/community"
            element={
              <ProtectedRoute>
                <Community />
              </ProtectedRoute>
            }
          />
          <Route
            path="/community/posts/:id"
            element={
              <ProtectedRoute>
                <PostDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}
