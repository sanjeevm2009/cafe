import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { apiRequest } from '../../services/api';
import { SeoHead } from '../../components/common/SeoHead';
import type { User } from '../../types';

export function AdminLoginPage() {
  const { user, setSessionUser, pushToast } = useApp();
  const navigate = useNavigate();

  const [bootstrapStatus, setBootstrapStatus] = useState<{
    hasAdmin: boolean;
    claimed: boolean;
    envPasscodeConfigured: boolean;
  } | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && ['super_admin', 'manager', 'staff'].includes(user.role)) {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    apiRequest<{ hasAdmin: boolean; claimed: boolean; envPasscodeConfigured: boolean }>('/api/admin/bootstrap-status')
      .then(setBootstrapStatus)
      .catch(() => setBootstrapStatus({ hasAdmin: true, claimed: true, envPasscodeConfigured: false }));
  }, []);

  const showBootstrapSetup = bootstrapStatus && !bootstrapStatus.hasAdmin && !bootstrapStatus.claimed;

  const handleBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      const res = await apiRequest<{ user: User; sessionToken: string }>('/api/admin/bootstrap', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, password, passcode }),
      });
      setSessionUser(res.user, res.sessionToken);
      pushToast('success', 'Initial Super Admin provisioned.');
      navigate('/admin', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Bootstrap failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      const res = await apiRequest<{ user: User; sessionToken: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (!['super_admin', 'manager', 'staff'].includes(res.user.role)) {
        setError('This account does not hold staff or administrator privileges.');
        return;
      }
      setSessionUser(res.user, res.sessionToken);
      pushToast('success', `Signed in as ${res.user.role.replace('_', ' ')}.`);
      navigate('/admin', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] bg-[#F0EDE5] py-16 lg:py-24 px-4 flex items-center justify-center">
      <SeoHead title="Atelier Admin Portal – MAISON CRUMB" description="Protected Maison Crumb administration and bakehouse management portal." />
      <div className="w-full max-w-md bg-white border border-[#E5DED3] p-8 sm:p-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-10 h-10 border border-[#E5DED3] bg-[#F8F6F1] text-[#69462D] mx-auto">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">Maison Crumb Atelier</p>
          <h1 className="font-serif text-3xl text-[#292722]">
            {showBootstrapSetup ? 'First-Run Super Admin Setup' : 'Administration Sign In'}
          </h1>
          <p className="text-xs text-[#81796D] leading-relaxed">
            {showBootstrapSetup
              ? 'No administrator account exists yet. Claim the initial Super Admin role with a secure password.'
              : 'Restricted to authorized Super Admin, Manager, and Staff accounts.'}
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-[#F0EDE5] border border-[#69462D] text-xs text-[#69462D]">{error}</div>
        )}

        {showBootstrapSetup ? (
          <form onSubmit={handleBootstrap} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Administrator Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                placeholder="Laurent Duval"
                className="w-full border border-[#E5DED3] px-4 py-2.5 text-sm focus:outline-none focus:border-[#8A6548]"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Admin Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="atelier@maisoncrumb.fr"
                className="w-full border border-[#E5DED3] px-4 py-2.5 text-sm focus:outline-none focus:border-[#8A6548]"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Password (Min. 10 characters)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={10}
                required
                className="w-full border border-[#E5DED3] px-4 py-2.5 text-sm focus:outline-none focus:border-[#8A6548]"
              />
            </div>
            {bootstrapStatus?.envPasscodeConfigured && (
              <div>
                <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Server Bootstrap Passcode</label>
                <input
                  type="password"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  required
                  className="w-full border border-[#E5DED3] px-4 py-2.5 text-sm focus:outline-none focus:border-[#8A6548]"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.18em] hover:bg-[#69462D] cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Provisioning...' : 'Claim Super Admin Access'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Staff Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-[#E5DED3] px-4 py-2.5 text-sm focus:outline-none focus:border-[#8A6548]"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-[#E5DED3] px-4 py-2.5 text-sm focus:outline-none focus:border-[#8A6548]"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.18em] hover:bg-[#69462D] cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Enter Atelier Dashboard'}
            </button>
          </form>
        )}

        <div className="pt-4 border-t border-[#E5DED3] text-center">
          <Link to="/" className="text-xs uppercase tracking-[0.16em] text-[#81796D] hover:text-[#292722]">
            &larr; Return to Public Storefront
          </Link>
        </div>
      </div>
    </div>
  );
}
