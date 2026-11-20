import { Outlet, Route, Routes } from 'react-router-dom';
import { X } from 'lucide-react';
import { useApp } from './contexts/AppContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/cart/CartDrawer';
import { HomePage } from './pages/Home/HomePage';
import { OurStoryPage } from './pages/About/OurStoryPage';
import { ArtOfBreadPage } from './pages/About/ArtOfBreadPage';
import { ProductsPage } from './pages/Products/ProductsPage';
import { ProductDetailsPage } from './pages/ProductDetails/ProductDetailsPage';
import { CartPage } from './pages/Cart/CartPage';
import { CheckoutPage } from './pages/Checkout/CheckoutPage';
import { OrderConfirmationPage } from './pages/Checkout/OrderConfirmationPage';
import { WorkshopsPage } from './pages/Workshops/WorkshopsPage';
import { WorkshopDetailsPage } from './pages/Workshops/WorkshopDetailsPage';
import { JournalPage } from './pages/Journal/JournalPage';
import { ContactPage } from './pages/Contact/ContactPage';
import { PrivacyPolicyPage, TermsPage } from './pages/Legal/LegalPages';
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { ForgotPasswordPage } from './pages/Auth/ForgotPasswordPage';
import { AccountDashboardPage } from './pages/Account/AccountDashboardPage';
import { AdminLoginPage } from './pages/Admin/AdminLoginPage';
import { AdminShell } from './pages/Admin/AdminShell';
import { AdminOverview } from './pages/Admin/AdminOverview';
import { AdminProductsPanel } from './pages/Admin/AdminProductsPanel';
import { AdminOrdersPanel } from './pages/Admin/AdminOrdersPanel';
import { AdminWorkshopsPanel } from './pages/Admin/AdminWorkshopsPanel';
import { AdminCmsPanel, AdminCustomersPanel, AdminEnquiriesPanel } from './pages/Admin/AdminCustomersCmsPanel';

function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8F6F1] text-[#292722]">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  );
}

function ToastViewport() {
  const { toasts, dismissToast } = useApp();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto border px-4 py-3 text-xs shadow-lg flex items-center justify-between gap-3 ${
            t.type === 'error'
              ? 'bg-[#69462D] text-[#F8F6F1] border-[#69462D]'
              : 'bg-[#292722] text-[#F8F6F1] border-[#8A6548]'
          }`}
        >
          <span>{t.text}</span>
          <button type="button" onClick={() => dismissToast(t.id)} aria-label="Dismiss notification" className="cursor-pointer opacity-75 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/our-story" element={<OurStoryPage />} />
          <Route path="/the-art-of-bread" element={<ArtOfBreadPage />} />
          <Route path="/creations" element={<ProductsPage />} />
          <Route path="/creations/:slug" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-confirmation/:id" element={<OrderConfirmationPage />} />
          <Route path="/workshops" element={<WorkshopsPage />} />
          <Route path="/workshops/:slug" element={<WorkshopDetailsPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ForgotPasswordPage />} />
          <Route path="/account" element={<AccountDashboardPage />} />
        </Route>

        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/admin" element={<AdminShell />}>
          <Route index element={<AdminOverview />} />
          <Route path="products" element={<AdminProductsPanel />} />
          <Route path="orders" element={<AdminOrdersPanel />} />
          <Route path="workshops" element={<AdminWorkshopsPanel />} />
          <Route path="customers" element={<AdminCustomersPanel />} />
          <Route path="cms" element={<AdminCmsPanel />} />
          <Route path="enquiries" element={<AdminEnquiriesPanel />} />
        </Route>
      </Routes>
      <ToastViewport />
    </>
  );
}
