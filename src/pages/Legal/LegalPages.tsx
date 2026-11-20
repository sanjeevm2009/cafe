import { SeoHead } from '../../components/common/SeoHead';

export function PrivacyPolicyPage() {
  return (
    <div className="bg-[#F8F6F1] py-16 lg:py-24">
      <SeoHead title="Privacy Policy – MAISON CRUMB" description="How Maison Crumb protects your personal and order information." />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">Legal &amp; Governance</p>
        <h1 className="font-serif text-4xl text-[#292722]">Privacy Policy</h1>
        <div className="bg-white border border-[#E5DED3] p-8 space-y-4 text-sm text-[#81796D] leading-relaxed">
          <p>MAISON CRUMB collects only the information necessary to fulfill your bakery orders, manage artisan workshop reservations, and administer your customer account.</p>
          <p>All session credentials are protected with HTTP-only, secure, partitioned cookies and salted scrypt password hashing. Payment card data is never stored on our servers and is processed exclusively through Stripe when configured.</p>
          <p>To request access to or deletion of your customer records, contact bonjour@maisoncrumb.fr.</p>
        </div>
      </div>
    </div>
  );
}

export function TermsPage() {
  return (
    <div className="bg-[#F8F6F1] py-16 lg:py-24">
      <SeoHead title="Terms & Conditions – MAISON CRUMB" description="Terms of bakery orders, Parisian delivery, and workshop bookings." />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[#8A6548]">Legal &amp; Governance</p>
        <h1 className="font-serif text-4xl text-[#292722]">Terms &amp; Conditions</h1>
        <div className="bg-white border border-[#E5DED3] p-8 space-y-4 text-sm text-[#81796D] leading-relaxed">
          <p>Fresh loaves and viennoiserie are baked daily in limited granite-hearth batches. Allergen disclosures (wheat, rye, dairy, eggs, sesame, tree nuts) are published on every creation page.</p>
          <p>Workshop reservations may be cancelled from your Customer Account dashboard prior to the session to release seats back into public availability.</p>
        </div>
      </div>
    </div>
  );
}
