export type UserRole = 'customer' | 'staff' | 'manager' | 'super_admin';
export type AccountStatus = 'active' | 'suspended';

export interface Address {
  id: string;
  label: string;
  street: string;
  city: string;
  postalCode: string;
  instructions?: string;
  isDefault?: boolean;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  accountStatus: AccountStatus;
  emailVerified: boolean;
  addresses: Address[];
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  categoryName?: string;
  categorySlug?: string;
  priceCents: number;
  imageUrls: string[];
  ingredients: string[];
  allergens: string[];
  weight: string;
  stock: number;
  isAvailable: boolean;
  isFeatured: boolean;
  salesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  product: Product;
}

export interface CartSummary {
  items: CartItem[];
  subtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  discountCode: string | null;
  totalCents: number;
  freeDeliveryThresholdCents: number;
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type OrderStatus = 'pending' | 'preparing' | 'out_for_delivery' | 'completed' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  slug: string;
  priceCents: number;
  quantity: number;
  imageUrl: string;
  weight: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerDetails: {
    fullName: string;
    email: string;
    phone: string;
  };
  deliveryAddress: {
    address: string;
    city: string;
    postalCode: string;
    instructions?: string;
  };
  items: OrderItem[];
  subtotalCents: number;
  deliveryFeeCents: number;
  discountCents: number;
  discountCode: string | null;
  totalCents: number;
  paymentMethod: 'stripe' | 'bakery_pickup';
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  paymentReference: string | null;
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Workshop {
  id: string;
  title: string;
  slug: string;
  description: string;
  imageUrls: string[];
  duration: string;
  priceCents: number;
  level: string;
  location: string;
  isActive: boolean;
  createdAt: string;
  slots?: WorkshopSlot[];
}

export interface WorkshopSlot {
  id: string;
  workshopId: string;
  date: string;
  startTime: string;
  endTime: string;
  maximumParticipants: number;
  bookedParticipants: number;
  status: 'open' | 'full' | 'cancelled';
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'refunded';

export interface Booking {
  id: string;
  bookingNumber: string;
  userId: string | null;
  workshopId: string;
  workshopTitle?: string;
  slotId: string;
  slotDate?: string;
  slotStartTime?: string;
  slotEndTime?: string;
  participantCount: number;
  customerDetails: {
    fullName: string;
    email: string;
    phone: string;
    notes?: string;
  };
  totalAmountCents: number;
  paymentMethod: 'stripe' | 'bakery_pickup';
  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;
  paymentReference: string | null;
  createdAt: string;
}

export interface WebsiteSection {
  sectionId: string;
  title: string;
  subtitle: string;
  description: string;
  images: string[];
  content: Record<string, any>;
  updatedAt: string;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'in_review' | 'resolved';
  createdAt: string;
}

export interface JournalArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  imageUrl: string;
  authorName: string;
  publishedAt: string;
}

export interface AdminDashboardStats {
  totalRevenueCents: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalCustomers: number;
  totalProducts: number;
  lowStockProducts: Product[];
  upcomingWorkshopsCount: number;
  recentBookings: Booking[];
  recentOrders: Order[];
  weeklyRevenue: { label: string; revenueCents: number; ordersCount: number }[];
  monthlyRevenue: { label: string; revenueCents: number; ordersCount: number }[];
  popularProducts: { name: string; salesCount: number; revenueCents: number }[];
  smtpConfigured: boolean;
  stripeConfigured: boolean;
}
