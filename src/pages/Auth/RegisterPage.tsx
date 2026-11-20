import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApp } from '../../contexts/AppContext';
import { apiRequest } from '../../services/api';
import { SeoHead } from '../../components/common/SeoHead';
import type { User } from '../../types';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const { setSessionUser, pushToast } = useApp();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (values: RegisterValues) => {
    setServerError(null);
    try {
      const res = await apiRequest<{ user: User; sessionToken: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setSessionUser(res.user, res.sessionToken);
      pushToast('success', 'Your Maison Crumb account has been created.');
      navigate('/account');
    } catch (err: any) {
      setServerError(err.message || 'Registration failed.');
    }
  };

  return (
    <div className="bg-[#F8F6F1] py-16 lg:py-24">
      <SeoHead title="Create Account – MAISON CRUMB" description="Register for faster checkout, saved Parisian addresses, and workshop tracking." />
      <div className="max-w-md mx-auto px-4">
        <div className="bg-white border border-[#E5DED3] p-8 sm:p-10 space-y-6">
          <div className="space-y-2 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">Join the Bakehouse</p>
            <h1 className="font-serif text-4xl text-[#292722]">Create Account</h1>
          </div>

          {serverError && (
            <div className="p-3.5 bg-[#F0EDE5] border border-[#69462D] text-xs text-[#69462D]">{serverError}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Full Name</label>
              <input {...register('fullName')} className="w-full border border-[#E5DED3] px-4 py-3 text-sm focus:outline-none focus:border-[#8A6548]" />
              {errors.fullName && <p className="text-xs text-[#69462D] mt-1">{errors.fullName.message}</p>}
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Email Address</label>
              <input type="email" {...register('email')} className="w-full border border-[#E5DED3] px-4 py-3 text-sm focus:outline-none focus:border-[#8A6548]" />
              {errors.email && <p className="text-xs text-[#69462D] mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Phone (Optional)</label>
              <input {...register('phone')} className="w-full border border-[#E5DED3] px-4 py-3 text-sm focus:outline-none focus:border-[#8A6548]" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-1.5">Password (Min. 8 characters)</label>
              <input type="password" {...register('password')} className="w-full border border-[#E5DED3] px-4 py-3 text-sm focus:outline-none focus:border-[#8A6548]" />
              {errors.password && <p className="text-xs text-[#69462D] mt-1">{errors.password.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.18em] hover:bg-[#69462D] transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-[#81796D] pt-4 border-t border-[#E5DED3]">
            Already registered?{' '}
            <Link to="/login" className="text-[#292722] font-medium underline underline-offset-4">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
