import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import Home from './pages/Home';
import Auth from './pages/Auth';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import Profile from './pages/Profile';
import Cart from './pages/Cart';
import Activity from './pages/Activity';
import MerchantDetail from './pages/MerchantDetail';
import ProductDetail from './pages/ProductDetail';
import Checkout from './pages/Checkout';
import JastipCatalog from './pages/JastipCatalog';
import AntarJemputOrder from './pages/AntarJemputOrder';
import KirimBarangOrder from './pages/KirimBarangOrder';
import OrderDetail from './pages/OrderDetail';
import ChatList from './pages/ChatList';
import ChatRoom from './pages/ChatRoom';
import TermsAndConditions from './pages/TermsAndConditions';
import PrivacyPolicy from './pages/PrivacyPolicy';
import { CartProvider } from './context/CartContext';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { Toaster } from 'react-hot-toast';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex justify-center items-center">Loading...</div>;
  }

  return (
    <CartProvider>
      <Toaster 
        position="top-center" 
        toastOptions={{
          style: {
            borderRadius: '9999px',
            background: '#333',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '500'
          },
        }} 
      />
      <Router>
        <Routes>
          {/* Auth Route without MainLayout */}
          <Route 
            path="/auth" 
            element={!session ? <Auth /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/forgot-password" 
            element={!session ? <ForgotPassword /> : <Navigate to="/" replace />} 
          />
          <Route 
            path="/update-password" 
            element={<UpdatePassword />} 
          />

          {/* Protected Routes with MainLayout */}
          <Route element={session ? <MainLayout /> : <Navigate to="/auth" replace />}>
            <Route path="/" element={<Home />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          
          {/* Standalone Protected Routes (no MainLayout, they have their own header/back button) */}
          <Route 
            path="/merchant/:id" 
            element={session ? <MerchantDetail /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/product/:id" 
            element={session ? <ProductDetail /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/checkout" 
            element={session ? <Checkout /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/jastip-catalog" 
            element={session ? <JastipCatalog /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/antar-jemput" 
            element={session ? <AntarJemputOrder /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/kirim-barang" 
            element={session ? <KirimBarangOrder /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/order/:id" 
            element={session ? <OrderDetail /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/chats" 
            element={session ? <ChatList /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/chat/:id" 
            element={session ? <ChatRoom /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/terms" 
            element={session ? <TermsAndConditions /> : <Navigate to="/auth" replace />} 
          />
          <Route 
            path="/privacy" 
            element={session ? <PrivacyPolicy /> : <Navigate to="/auth" replace />} 
          />
        </Routes>
      </Router>
    </CartProvider>
  );
}

export default App;
