import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../../services/api';
import { SeoHead } from '../../components/common/SeoHead';

export function ForgotPasswordPage() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [email, setEmail] = useState('');
  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      setLoading(true);
      const res = await apiRequest<{ message: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setStatusMessage(res.message);
    } catch (err: any) {
      setErrorMessage(err.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusMessage(null);
    try {
      setLoading(true);
      const res = await apiRequest<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      });
      setStatusMessage(res.message);
    } catch (err: any) {
      setErrorMessage(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#F8F6F1] py-16 lg:py-24">
      <SeoHead title="Reset Password – MAISON CRUMB" description="Recover access to your Maison Crumb account." />
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white border border-[#E5DED3] p-8 sm:p-10 space-y-6">
          <div className="space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">Account Recovery</p>
            <h1 className="font-serif text-3xl text-[#292722]">
              {tokenFromUrl ? 'Set New Password' : 'Forgot Password'}
            </h1>
          </div>

          {statusMessage && <div className="p-3.5 bg-[#F0EDE5] border border-[#8A6548] text-xs text-[#292722]">{statusMessage}</div>}
          {errorMessage && <div className="p-3.5 bg-[#F0EDE5] border border-[#69462D] text-xs text-[#69462D]">{errorMessage}</div>}

          {tokenFromUrl ? (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Reset Token</label>
                <input
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  className="w-full border border-[#E5DED3] px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">New Password (Min. 8 chars)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  required
                  className="w-full border border-[#E5DED3] px-4 py-3 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.18em] cursor-pointer"
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Registered Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-[#E5DED3] px-4 py-3 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.18em] cursor-pointer"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <p className="text-center text-xs uppercase tracking-[0.16em] text-[#81796D] pt-3 border-t border-[#E5DED3]">
            <Link to="/login" className="hover:text-[#292722]">Return to Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
