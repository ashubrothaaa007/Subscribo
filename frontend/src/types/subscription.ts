export type SubscriptionState = 'draft' | 'quotation' | 'confirmed' | 'active' | 'closed';

export interface SubscriptionAddon {
  id: number;
  productId: number;
  name: string;
  price: number;
  isActive: boolean;
  activatedAt?: string;
  disabledAt?: string;
  pendingChangeOrderId?: number;
}

export interface SubscriptionEvent {
  id: number;
  eventType: string;
  userName: string;
  details: string;
  date: string;
}

export interface Subscription {
  id: number;
  name: string;
  saleOrderId: number;
  saleOrderName: string;
  partnerId: number;
  partnerName: string;
  planId: number;
  planName: string;
  planCode: string;
  quantity: number;
  startDate: string;
  expiryDate: string;
  currency: string;
  amountUntaxed: number;
  amountTax: number;
  amountTotal: number;
  state: SubscriptionState;
  isPaused: boolean;
  pauseStartedAt?: string;
  renewedFromId?: number;
  renewalIds: number[];
  closedAt?: string;
  nextInvoiceDate?: string;
  billingPeriodStart?: string;
  billingPeriodEnd?: string;
  billingStatus?: string;
  invoiceCount?: number;
  addons: SubscriptionAddon[];
  events: SubscriptionEvent[];
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  code: string;
  price: number;
  currency: string;
  billingInterval: 'monthly' | 'yearly' | 'quarterly' | 'daily' | 'weekly';
  intervalCount: number;
  active: boolean;
  description: string;
  productId: number;
  productName: string;
  addonProductIds: number[];
}

