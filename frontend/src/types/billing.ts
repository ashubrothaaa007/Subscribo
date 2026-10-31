export interface InvoiceLine {
  id: number;
  productId: number;
  productName: string;
  name: string;
  quantity: number;
  priceUnit: number;
  priceSubtotal: number;
}

export interface Invoice {
  id: number;
  name: string;
  partnerId: number;
  partnerName: string;
  subscriptionId?: number;
  subscriptionName?: string;
  billingStart?: string;
  billingEnd?: string;
  invoiceDate: string;
  invoiceDateDue?: string;
  state: 'draft' | 'posted' | 'cancel';
  paymentState: 'not_paid' | 'in_payment' | 'paid' | 'reversed';
  amountUntaxed: number;
  amountTax: number;
  amountTotal: number;
  currency: string;
  isRecurring: boolean;
  invoiceOrigin?: string;
  lines: InvoiceLine[];
}

export interface UpcomingBillingItem {
  subscriptionId: number;
  subscriptionName: string;
  partnerId: number;
  partnerName: string;
  planName: string;
  billingInterval: string;
  billingStart: string;
  billingEnd: string;
  nextInvoiceDate: string;
  estimatedAmount: number;
  currency: string;
  isDue: boolean;
  status: 'due' | 'upcoming' | 'paused' | 'closed';
}

export interface BillingStats {
  totalInvoicedAmount: number;
  totalInvoiceCount: number;
  paidInvoiceCount: number;
  draftInvoiceCount: number;
  dueSoonCount: number;
  upcomingMonthlyRevenue: number;
}

