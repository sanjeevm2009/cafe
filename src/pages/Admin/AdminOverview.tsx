import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiRequest, formatEur } from '../../services/api';
import type { AdminDashboardStats } from '../../types';

function RevenueBarChart({ data, title }: { data: { label: string; revenueCents: number; ordersCount: number }[]; title: string }) {
  const maxVal = Math.max(100, ...data.map((d) => d.revenueCents));

  return (
    <div className="bg-white border border-[#E5DED3] p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-xl text-[#292722]">{title}</h3>
        <span className="text-xs uppercase tracking-[0.14em] text-[#81796D]">EUR Revenue</span>
      </div>
      <div className="grid grid-cols-7 gap-3 items-end h-44 pt-4">
        {data.map((point, idx) => {
          const pct = Math.max(6, Math.round((point.revenueCents / maxVal) * 100));
          return (
            <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end">
              <span className="text-[10px] tabular-nums text-[#81796D]">
                {point.revenueCents > 0 ? `€${Math.round(point.revenueCents / 100)}` : '€0'}
              </span>
              <div className="w-full bg-[#F0EDE5] flex items-end h-28">
                <div
                  style={{ height: `${pct}%` }}
                  className="w-full bg-[#8A6548] transition-all duration-300"
                  title={`${point.label}: ${formatEur(point.revenueCents)} (${point.ordersCount} orders)`}
                />
              </div>
              <span className="text-[11px] uppercase tracking-wider text-[#81796D]">{point.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminOverview() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest<{ stats: AdminDashboardStats }>('/api/admin/dashboard')
      .then((res) => setStats(res.stats))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-4 gap-5">{[1, 2, 3, 4].map((i) => <div key={i} className="h-28 bg-white border border-[#E5DED3] animate-pulse" />)}</div>;
  }

  if (!stats) {
    return <div className="bg-white border border-[#E5DED3] p-8 text-sm text-[#69462D]">Unable to load bakehouse metrics.</div>;
  }

  const kpis = [
    { label: 'Total Revenue', value: formatEur(stats.totalRevenueCents) },
    { label: 'Total Orders', value: String(stats.totalOrders) },
    { label: 'Pending Orders', value: String(stats.pendingOrders) },
    { label: 'Completed Orders', value: String(stats.completedOrders) },
    { label: 'Registered Customers', value: String(stats.totalCustomers) },
    { label: 'Active Creations', value: String(stats.totalProducts) },
    { label: 'Low Stock Alerts', value: String(stats.lowStockProducts.length) },
    { label: 'Upcoming Workshop Slots', value: String(stats.upcomingWorkshopsCount) },
  ];

  return (
    <div className="space-y-8">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white border border-[#E5DED3] p-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#81796D]">{k.label}</p>
            <p className="font-serif text-3xl text-[#292722] mt-2 tabular-nums">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Integration Status Notice */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-[#E5DED3] p-5 flex items-start gap-3">
          {stats.stripeConfigured ? (
            <CheckCircle2 className="w-5 h-5 text-[#69462D] shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-[#8A6548] shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <p className="font-medium text-[#292722]">
              Stripe Payment Gateway: {stats.stripeConfigured ? 'Connected' : 'Configuration Required'}
            </p>
            <p className="text-[#81796D]">
              {stats.stripeConfigured
                ? 'Live PaymentIntents and webhook verification are active.'
                : 'Set STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, and STRIPE_WEBHOOK_SECRET in server environment variables to process online cards.'}
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#E5DED3] p-5 flex items-start gap-3">
          {stats.smtpConfigured ? (
            <CheckCircle2 className="w-5 h-5 text-[#69462D] shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-[#8A6548] shrink-0 mt-0.5" />
          )}
          <div className="text-xs space-y-1">
            <p className="font-medium text-[#292722]">
              Email Dispatch (SMTP): {stats.smtpConfigured ? 'Connected' : 'Configuration Required'}
            </p>
            <p className="text-[#81796D]">
              {stats.smtpConfigured
                ? 'Order, booking, and password reset emails are actively dispatched.'
                : 'Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS to dispatch real transactional emails. Events are logged in Notifications.'}
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueBarChart data={stats.weeklyRevenue} title="Weekly Revenue (Last 7 Days)" />
        <RevenueBarChart
          data={stats.monthlyRevenue.map((m) => ({ ...m }))}
          title="Monthly Revenue & Order Volume (6 Months)"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Popular Products */}
        <div className="lg:col-span-5 bg-white border border-[#E5DED3] p-6 space-y-4">
          <h3 className="font-serif text-xl text-[#292722]">Popular Creations</h3>
          <div className="space-y-3">
            {stats.popularProducts.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-[#E5DED3] last:border-0">
                <div>
                  <p className="text-[#292722] font-medium">{p.name}</p>
                  <p className="text-xs text-[#81796D] tabular-nums">{p.salesCount} sold</p>
                </div>
                <span className="tabular-nums font-medium text-[#69462D]">{formatEur(p.revenueCents)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock & Recent Bookings */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#E5DED3] p-6 space-y-4">
            <h3 className="font-serif text-xl text-[#292722]">Low-Stock Alerts (&le; 5 units)</h3>
            {stats.lowStockProducts.length === 0 ? (
              <p className="text-sm text-[#81796D]">All creations are well stocked.</p>
            ) : (
              <div className="divide-y divide-[#E5DED3]">
                {stats.lowStockProducts.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                    <span className="text-[#292722]">{p.name}</span>
                    <span className="tabular-nums text-xs uppercase tracking-wider text-[#69462D] font-medium">
                      {p.stock} left
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-[#E5DED3] p-6 space-y-4">
            <h3 className="font-serif text-xl text-[#292722]">Recent Workshop Bookings</h3>
            {stats.recentBookings.length === 0 ? (
              <p className="text-sm text-[#81796D]">No workshop bookings yet.</p>
            ) : (
              <div className="divide-y divide-[#E5DED3]">
                {stats.recentBookings.map((b) => (
                  <div key={b.id} className="py-2.5 flex items-center justify-between text-sm gap-4">
                    <div>
                      <p className="text-[#292722] font-medium">{b.customerDetails.fullName} · {b.workshopTitle}</p>
                      <p className="text-xs text-[#81796D] tabular-nums">
                        {b.slotDate} ({b.participantCount} guest(s)) · {b.bookingStatus}
                      </p>
                    </div>
                    <span className="tabular-nums font-medium">{formatEur(b.totalAmountCents)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
