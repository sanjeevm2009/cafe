import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApp } from '../../contexts/AppContext';
import { apiRequest } from '../../services/api';
import { SeoHead } from '../../components/common/SeoHead';

const contactSchema = z.object({
  name: z.string().min(2, 'Please enter your name'),
  email: z.string().email('Please enter a valid email address'),
  subject: z.string().min(2, 'Please provide a subject'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export function ContactPage() {
  const { cmsSections, pushToast } = useApp();
  const [submitted, setSubmitted] = useState(false);

  const footer = cmsSections.footer;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (values: ContactFormValues) => {
    try {
      await apiRequest('/api/contact', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      setSubmitted(true);
      reset();
      pushToast('success', 'Your message has been sent to our Rue des Martyrs team.');
    } catch (err: any) {
      pushToast('error', err.message || 'Unable to send enquiry.');
    }
  };

  return (
    <div className="bg-[#F8F6F1] py-16 lg:py-24">
      <SeoHead
        title="Contact & Paris Atelier – MAISON CRUMB"
        description="Visit our Paris IX boulangerie at 42 Rue des Martyrs or send an enquiry regarding bespoke orders and private workshops."
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5 space-y-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">Rue des Martyrs · Paris IX</p>
          <h1 className="font-serif text-4xl sm:text-5xl text-[#292722]">Write to the Atelier</h1>
          <p className="text-sm text-[#81796D] leading-relaxed">
            Whether arranging private dining bread service, bespoke celebration loaves, or group workshop reservations, our bakers respond daily between bakes.
          </p>

          <div className="bg-white border border-[#E5DED3] p-6 space-y-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#81796D]">Bakehouse &amp; Boutique</p>
              <p className="text-[#292722] mt-1">{footer?.content?.address || '42 Rue des Martyrs, 75009 Paris, France'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#81796D]">Opening Hours</p>
              <p className="text-[#292722] mt-1">{footer?.content?.hours || 'Tuesday – Sunday · 07:00 – 19:30'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[#81796D]">Telephone &amp; Correspondence</p>
              <p className="text-[#292722] mt-1 tabular-nums">{footer?.content?.phone || '+33 1 42 85 19 04'}</p>
              <p className="text-[#69462D]">{footer?.content?.email || 'bonjour@maisoncrumb.fr'}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white border border-[#E5DED3] p-8 sm:p-10">
          {submitted ? (
            <div className="py-10 space-y-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#8A6548]">Enquiry Recorded</p>
              <h2 className="font-serif text-3xl text-[#292722]">Merci pour votre message</h2>
              <p className="text-sm text-[#81796D] leading-relaxed">
                Your note has been logged for our Paris bakery managers. We will reply shortly.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="px-5 py-2.5 border border-[#292722] text-xs uppercase tracking-[0.16em] cursor-pointer"
              >
                Send Another Note
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-2">Full Name</label>
                  <input
                    {...register('name')}
                    className="w-full border border-[#E5DED3] bg-[#F8F6F1]/50 px-4 py-3 text-sm focus:outline-none focus:border-[#8A6548]"
                  />
                  {errors.name && <p className="text-xs text-[#69462D] mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-2">Email</label>
                  <input
                    type="email"
                    {...register('email')}
                    className="w-full border border-[#E5DED3] bg-[#F8F6F1]/50 px-4 py-3 text-sm focus:outline-none focus:border-[#8A6548]"
                  />
                  {errors.email && <p className="text-xs text-[#69462D] mt-1">{errors.email.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-2">Subject</label>
                <input
                  {...register('subject')}
                  placeholder="Private event order, hospitality supply, or workshop question"
                  className="w-full border border-[#E5DED3] bg-[#F8F6F1]/50 px-4 py-3 text-sm focus:outline-none focus:border-[#8A6548]"
                />
                {errors.subject && <p className="text-xs text-[#69462D] mt-1">{errors.subject.message}</p>}
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.16em] text-[#81796D] mb-2">Message</label>
                <textarea
                  rows={5}
                  {...register('message')}
                  className="w-full border border-[#E5DED3] bg-[#F8F6F1]/50 px-4 py-3 text-sm focus:outline-none focus:border-[#8A6548]"
                />
                {errors.message && <p className="text-xs text-[#69462D] mt-1">{errors.message.message}</p>}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3.5 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.18em] hover:bg-[#69462D] transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Send Enquiry'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
