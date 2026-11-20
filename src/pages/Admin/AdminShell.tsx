import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, BookOpen, Calendar, LogOut, Mail, Package, ShoppingBag, Users } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { SeoHead } from '../../components/common/SeoHead';

export function AdminShell() {
  const { user, authLoading, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  if (authLoading) {
    return <div className="p-16 text-center text-sm text-[#81796D]">Verifying atelier session...</div>;
  }

  if (!user || !['super_admin', 'manager', 'staff'].includes(user.role)) {
    return <Navigate to="/admin/login" replace />;
  }

  const navItems = [
    { label: 'Overview', to: '/admin', icon: BarChart3 },
    { label: 'Products & Categories', to: '/admin/products', icon: Package },
    { label: 'Orders', to: '/admin/orders', icon: ShoppingBag },
    { label: 'Workshops & Bookings', to: '/admin/workshops', icon: Calendar },
    { label: 'Customers & Staff', to: '/admin/customers', icon: Users },
    { label: 'Website CMS', to: '/admin/cms', icon: BookOpen },
    { label: 'Enquiries & Dispatch', to: '/admin/enquiries', icon: Mail },
  ];

  return (
    <div className="min-h-screen bg-[#F8F6F1] flex flex-col lg:flex-row">
      <SeoHead title="Atelier Admin – MAISON CRUMB" description="Maison Crumb internal management dashboard." />

      <aside className="w-full lg:w-64 bg-[#292722] text-[#F8F6F1] flex flex-col justify-between shrink-0">
        <div>
          <div className="px-6 py-6 border-b border-[#81796D]/30">
            <Link to="/" className="font-serif text-xl tracking-[0.14em] block">
              MAISON CRUMB
            </Link>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#E9E3D8]/65 mt-1">
              {user.role.replace('_', ' ')} · {user.fullName}
            </p>
          </div>
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3.5 py-2.5 text-xs uppercase tracking-[0.14em] transition-colors ${
                    active ? 'bg-[#8A6548] text-white' : 'text-[#E9E3D8]/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-[#81796D]/30 space-y-2">
          <Link to="/" className="block text-center py-2 border border-[#81796D]/40 text-xs uppercase tracking-[0.14em] text-[#E9E3D8] hover:bg-white/10">
            View Public Site
          </Link>
          <button
            type="button"
            onClick={async () => {
              await logout();
              navigate('/admin/login');
            }}
            className="w-full inline-flex items-center justify-center gap-2 py-2 text-xs uppercase tracking-[0.14em] text-[#E9E3D8]/75 hover:text-white cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 sm:p-10 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
