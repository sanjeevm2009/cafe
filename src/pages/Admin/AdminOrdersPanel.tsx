import { useEffect, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { apiRequest, formatEur } from '../../services/api';
import type { Order } from '../../types';

export function AdminOrdersPanel() {
  const { pushToast } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const [notes, setNotes] = useState('');

  const loadOrders = async () => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (search.trim()) params.set('search', search.trim());
    const res = await apiRequest<{ orders: Order[] }>(`/api/admin/orders?${params.toString()}`);
    setOrders(res.orders);
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter]);

  const handleUpdateOrder = async (orderId: string, payload: Partial<{ orderStatus: string; paymentStatus: string; internalNotes: string }>) => {
    try {
      const res = await apiRequest<{ order: Order }>(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      pushToast('success', `Order ${res.order.orderNumber} updated.`);
      if (selected?.id === orderId) {
        setSelected(res.order);
      }
      loadOrders();
    } catch (err: any) {
      pushToast('error', err.message || 'Could not update order.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="font-serif text-3xl text-[#292722]">Orders Management</h2>
        <div className="flex flex-wrap gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadOrders()}
            placeholder="Search order # or customer..."
            className="bg-white border border-[#E5DED3] px-3 py-2 text-sm"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white border border-[#E5DED3] px-3 py-2 text-sm">
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <button type="button" onClick={loadOrders} className="px-4 py-2 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-wider cursor-pointer">
            Filter
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 bg-white border border-[#E5DED3] overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5DED3] bg-[#F8F6F1] text-[11px] uppercase tracking-[0.16em] text-[#81796D]">
              <tr>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Guest</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5DED3]">
              {orders.map((o) => (
                <tr
                  key={o.id}
                  onClick={() => {
                    setSelected(o);
                    setNotes(o.internalNotes || '');
                  }}
                  className={`cursor-pointer hover:bg-[#F8F6F1] ${selected?.id === o.id ? 'bg-[#F0EDE5]' : ''}`}
                >
                  <td className="py-3 px-4 font-medium tabular-nums">{o.orderNumber}</td>
                  <td className="py-3 px-4">{o.customerDetails.fullName}</td>
                  <td className="py-3 px-4 tabular-nums">{formatEur(o.totalCents)}</td>
                  <td className="py-3 px-4 text-xs capitalize">{o.paymentStatus}</td>
                  <td className="py-3 px-4 text-xs capitalize text-[#69462D] font-medium">{o.orderStatus.replace(/_/g, ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-5 bg-white border border-[#E5DED3] p-6">
          {!selected ? (
            <p className="text-sm text-[#81796D]">Select an order row to inspect items, update fulfillment status, or record baker notes.</p>
          ) : (
            <div className="space-y-5">
              <div className="pb-3 border-b border-[#E5DED3] flex justify-between items-baseline">
                <h3 className="font-serif text-2xl text-[#292722] tabular-nums">{selected.orderNumber}</h3>
                <span className="text-base font-medium tabular-nums">{formatEur(selected.totalCents)}</span>
              </div>

              <div className="text-xs space-y-1 text-[#81796D]">
                <p><strong className="text-[#292722]">Guest:</strong> {selected.customerDetails.fullName} · {selected.customerDetails.email}</p>
                <p><strong className="text-[#292722]">Phone:</strong> {selected.customerDetails.phone}</p>
                <p><strong className="text-[#292722]">Delivery:</strong> {selected.deliveryAddress.address}, {selected.deliveryAddress.postalCode} {selected.deliveryAddress.city}</p>
              </div>

              <div className="border-t border-b border-[#E5DED3] py-3 space-y-1.5 text-sm">
                {selected.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{item.quantity} × {item.name}</span>
                    <span className="tabular-nums">{formatEur(item.priceCents * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#81796D] mb-1">Order Status</label>
                  <select
                    value={selected.orderStatus}
                    onChange={(e) => handleUpdateOrder(selected.id, { orderStatus: e.target.value })}
                    className="w-full border border-[#E5DED3] px-3 py-2 text-xs bg-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="preparing">Preparing</option>
                    <option value="out_for_delivery">Out for Delivery</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wider text-[#81796D] mb-1">Payment Status</label>
                  <select
                    value={selected.paymentStatus}
                    onChange={(e) => handleUpdateOrder(selected.id, { paymentStatus: e.target.value })}
                    className="w-full border border-[#E5DED3] px-3 py-2 text-xs bg-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[11px] uppercase tracking-wider text-[#81796D]">Internal Atelier Notes</label>
                <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full border border-[#E5DED3] px-3 py-2 text-sm" />
                <button
                  type="button"
                  onClick={() => handleUpdateOrder(selected.id, { internalNotes: notes })}
                  className="px-5 py-2 bg-[#292722] text-[#F8F6F1] text-xs uppercase tracking-[0.14em] cursor-pointer"
                >
                  Save Notes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
