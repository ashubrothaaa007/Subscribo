export interface QuotationLine {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  priceUnit: number;
  priceSubtotal: number;
  isPlanLine: boolean;
  isAddonLine: boolean;
}

export interface Quotation {
  id: number;
  name: string;
  partnerId: number;
  partnerName: string;
  planId?: number;
  planName?: string;
  quantity: number;
  startDate?: string;
  expiryDate?: string;
  amountUntaxed: number;
  amountTax: number;
  amountTotal: number;
  currency: string;
  state: 'draft' | 'sent' | 'sale' | 'cancel';
  dateOrder: string;
  isSubscription: boolean;
  isAddonChange: boolean;
  lines: QuotationLine[];
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  companyName?: string;
  street?: string;
  city?: string;
  subscriptionCount: number;
  activeSubscriptions: number;
}

export interface StaffMember {
  id: number;
  name: string;
  login: string;
  email: string;
  role: string;
  active: boolean;
}

export interface ProductCatalogItem {
  id: number;
  name: string;
  code: string;
  listPrice: number;
  type: string;
  isService: boolean;
  isAddon: boolean;
}

export interface DashboardStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  pausedSubscriptions: number;
  draftQuotations: number;
  monthlyRecurringValue: number;
  totalCustomers: number;
  expiringSoonCount: number;
}

