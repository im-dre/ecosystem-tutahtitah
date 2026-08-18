import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, ShoppingCart, Activity, User, MessageCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function MainLayout() {
  const location = useLocation();
  const { cartCount } = useCart();

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Keranjang', path: '/cart', icon: ShoppingCart },
    { name: 'Aktivitas', path: '/activity', icon: Activity },
    { name: 'Chat', path: '/chats', icon: MessageCircle },
  ];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex flex-col shadow-xl sm:border-x sm:border-gray-200">
      {/* Content Area */}
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-200 py-2 px-6 flex justify-between items-center z-50">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center space-y-1 transition-colors duration-200 relative ${
                isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className={`p-1.5 rounded-xl ${isActive ? 'bg-blue-50' : ''}`}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                {item.name === 'Keranjang' && cartCount > 0 && (
                  <span className="absolute top-0 right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border border-white">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
