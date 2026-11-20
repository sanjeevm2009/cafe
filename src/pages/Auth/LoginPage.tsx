import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApp } from '../../contexts/AppContext';
import { apiRequest } from '../../services/api';
import { SeoHead } from '../../components/common/SeoHead';
import type { User } from '../../types';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { setSessionUser, pushToast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || '/account';
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    setServerError(null);
    try {
      const res = await apiRequest<{ user: User; sessionToken: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setSessionUser(res.user, res.sessionToken);
      pushToast('success', `Welcome back, ${res.user.fullName}.`);
      navigate(from, { replace: true });
    } catch (err: any) {
      setServerError(err.message || 'Sign in failed.');
    }
  };

  return (
    <div className="bg-[#F8F6F1] py-16 lg:py-24">
      <SeoHead title="Sign In – MAISON CRUMB" description="Access your Maison Crumb customer account, orders, and workshop reservations." />
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white border border-[#E5DED3] p-8 sm:p-10 space-y-6">
          <div className="space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">Customer Account</p>
            <h1 className="font-serif text-4xl text-[#292722]">Sign In</h1>
          </div>

          {serverError && (
            <div className="p-3.5 bg-[#F0EDE5] border border-[#69462D] text-xs text-[#69462D]">{serverError}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Email Address</label>
              <input type="email" {...register('email')} className="w-full border border-[#E5DED3] px-4 py-3 text-sm focus:outline-none focus:border-[#8A6548]" />
              {errors.email && <p className="text-xs text-[#69462D] mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs uppercase tracking-[0.16em] text-[#81796D]">Password</label>
                <Link to="/forgot-password" className="text-xs text-[#8A6548] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <input type="password" {...register('password')} className="w-full border border-[#E5DED3] px-4 py-3 text-sm focus:outline-none focus:border-[#8A6548]" />
              {errors.password && <p className="text-xs text-[#69462D] mt-1">{errors.password.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.18em] hover:bg-[#69462D] transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-[#81796D] pt-4 border-t border-[#E5DED3]">
            New to Maison Crumb?{' '}
            <Link to="/register" className="text-[#292722] font-medium underline underline-offset-4">
              Create an Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
