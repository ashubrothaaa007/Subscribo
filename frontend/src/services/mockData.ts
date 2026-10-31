import type {
  Subscription,
  SubscriptionPlan,
  Quotation,
  Customer,
  StaffMember,
  ProductCatalogItem,
  DashboardStats,
  Invoice,
  UpcomingBillingItem,
  BillingStats,
  User,
  UserRole,
} from '../types';

export const INITIAL_PLANS: SubscriptionPlan[] = [
  {
    id: 1,
    name: 'Professional Monthly Plan',
    code: 'SUB-PRO-M',
    price: 99.0,
    currency: '$',
    billingInterval: 'monthly',
    intervalCount: 1,
    active: true,
    description: 'High-performance cloud subscription with daily automated billing & 99.9% uptime SLA.',
    productId: 10,
    productName: 'Professional Monthly Service',
    addonProductIds: [1, 2, 3],
  },
  {
    id: 2,
    name: 'Enterprise Annual Tier',
    code: 'SUB-ENT-Y',
    price: 999.0,
    currency: '$',
    billingInterval: 'yearly',
    intervalCount: 1,
    active: true,
    description: 'Full enterprise suite with dedicated customer success manager, multi-region replication and annual billing discount.',
    productId: 11,
    productName: 'Enterprise Annual Service',
    addonProductIds: [1, 2, 3, 4, 5],
  },
  {
    id: 3,
    name: 'Basic Weekly Starter',
    code: 'SUB-BAS-W',
    price: 25.0,
    currency: '$',
    billingInterval: 'weekly',
    intervalCount: 1,
    active: true,
    description: 'Flexible week-to-week access for short sprint projects and temporary computing resources.',
    productId: 12,
    productName: 'Basic Weekly Service',
    addonProductIds: [1],
  },
  {
    id: 4,
    name: 'Developer Daily Pass',
    code: 'SUB-DEV-D',
    price: 5.0,
    currency: '$',
    billingInterval: 'daily',
    intervalCount: 1,
    active: true,
    description: 'Pay-as-you-go daily test sandbox with instant provisioning and automated daily closing reconciliation.',
    productId: 13,
    productName: 'Developer Daily Service',
    addonProductIds: [1, 3],
  },
];

export const INITIAL_PRODUCTS: ProductCatalogItem[] = [
  { id: 1, name: 'SLA Priority Support 24/7', code: 'SLA-247', listPrice: 29.0, type: 'service', isService: true, isAddon: true },
  { id: 2, name: 'Dedicated Customer Success Manager', code: 'CSM-DED', listPrice: 149.0, type: 'service', isService: true, isAddon: true },
  { id: 3, name: 'Additional 100GB Cloud Storage', code: 'ADD-STOR-100', listPrice: 19.0, type: 'service', isService: true, isAddon: true },
  { id: 4, name: 'Advanced Webhook Integrations', code: 'ADD-WEBHOOK', listPrice: 39.0, type: 'service', isService: true, isAddon: true },
  { id: 5, name: 'Multi-Region Replication Engine', code: 'ADD-REPL', listPrice: 79.0, type: 'service', isService: true, isAddon: true },
  { id: 10, name: 'Professional Monthly Service', code: 'SRV-PRO-M', listPrice: 99.0, type: 'service', isService: true, isAddon: false },
  { id: 11, name: 'Enterprise Annual Service', code: 'SRV-ENT-Y', listPrice: 999.0, type: 'service', isService: true, isAddon: false },
  { id: 12, name: 'Basic Weekly Service', code: 'SRV-BAS-W', listPrice: 25.0, type: 'service', isService: true, isAddon: false },
  { id: 13, name: 'Developer Daily Service', code: 'SRV-DEV-D', listPrice: 5.0, type: 'service', isService: true, isAddon: false },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 1386,
    name: 'Acme Corporation (Customer)',
    email: 'portal.customer@example.com',
    phone: '+1 555-0199',
    companyName: 'Acme Corporation',
    street: '100 Innovation Way',
    city: 'San Francisco, CA',
    subscriptionCount: 3,
    activeSubscriptions: 2,
  },
  {
    id: 1387,
    name: 'TechStart Innovations Ltd',
    email: 'contact@techstart.io',
    phone: '+1 555-0245',
    companyName: 'TechStart Innovations Ltd',
    street: '45 Tech Boulevard',
    city: 'Austin, TX',
    subscriptionCount: 1,
    activeSubscriptions: 0,
  },
  {
    id: 1388,
    name: 'Global Logistics Operations',
    email: 'operations@globallogistics.com',
    phone: '+1 555-0378',
    companyName: 'Global Logistics Operations',
    street: '88 Supply Road',
    city: 'Chicago, IL',
    subscriptionCount: 1,
    activeSubscriptions: 1,
  },
];

export const INITIAL_STAFF: StaffMember[] = [
  { id: 2, name: 'System Administrator', login: 'admin', email: 'admin@subscribo.local', role: 'Administrator', active: true },
  { id: 1027, name: 'Sarah Staff', login: 'staff@example.com', email: 'staff@example.com', role: 'SUBSCRIBO Staff', active: true },
];

export const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 1,
    name: 'SUB-2026-0001',
    saleOrderId: 101,
    saleOrderName: 'SO001',
    partnerId: 1386,
    partnerName: 'Acme Corporation (Customer)',
    planId: 1,
    planName: 'Professional Monthly Plan',
    planCode: 'SUB-PRO-M',
    quantity: 1,
    startDate: '2026-10-01',
    expiryDate: '2026-11-01',
    currency: '$',
    amountUntaxed: 128.0,
    amountTax: 0,
    amountTotal: 128.0,
    state: 'active',
    isPaused: false,
    nextInvoiceDate: '2026-11-01',
    billingPeriodStart: '2026-10-01',
    billingPeriodEnd: '2026-11-01',
    billingStatus: 'ready',
    invoiceCount: 2,
    addons: [
      {
        id: 1,
        productId: 1,
        name: 'SLA Priority Support 24/7',
        price: 29.0,
        isActive: true,
        activatedAt: '2026-10-01 09:00:00',
      },
    ],
    events: [
      { id: 1, eventType: 'create', userName: 'System Administrator', details: 'Subscription provisioned from Sale Order SO001', date: '2026-10-01 09:00:00' },
      { id: 2, eventType: 'invoice_generated', userName: 'Billing Automation Cron', details: 'Recurring Invoice INV/2026/0001 created ($128.00)', date: '2026-10-01 09:05:00' },
    ],
    renewalIds: [],
  },
  {
    id: 2,
    name: 'SUB-2026-0002',
    saleOrderId: 102,
    saleOrderName: 'SO002',
    partnerId: 1386,
    partnerName: 'Acme Corporation (Customer)',
    planId: 2,
    planName: 'Enterprise Annual Tier',
    planCode: 'SUB-ENT-Y',
    quantity: 2,
    startDate: '2026-01-01',
    expiryDate: '2027-01-01',
    currency: '$',
    amountUntaxed: 2166.0,
    amountTax: 0,
    amountTotal: 2166.0,
    state: 'active',
    isPaused: false,
    nextInvoiceDate: '2026-12-01',
    billingPeriodStart: '2026-01-01',
    billingPeriodEnd: '2027-01-01',
    billingStatus: 'ready',
    invoiceCount: 1,
    addons: [
      {
        id: 2,
        productId: 2,
        name: 'Dedicated Customer Success Manager',
        price: 149.0,
        isActive: true,
        activatedAt: '2026-01-01 10:00:00',
      },
      {
        id: 3,
        productId: 3,
        name: 'Additional 100GB Cloud Storage',
        price: 19.0,
        isActive: true,
        activatedAt: '2026-01-01 10:00:00',
      },
    ],
    events: [
      { id: 3, eventType: 'create', userName: 'System Administrator', details: 'Enterprise tier contract confirmed via SO002', date: '2026-01-01 10:00:00' },
      { id: 4, eventType: 'invoice_generated', userName: 'Billing Automation Cron', details: 'Annual recurring invoice INV/2026/0002 posted', date: '2026-01-01 10:05:00' },
    ],
    renewalIds: [],
  },
  {
    id: 3,
    name: 'SUB-2026-0003',
    saleOrderId: 103,
    saleOrderName: 'SO003',
    partnerId: 1387,
    partnerName: 'TechStart Innovations Ltd',
    planId: 3,
    planName: 'Basic Weekly Starter',
    planCode: 'SUB-BAS-W',
    quantity: 1,
    startDate: '2026-10-01',
    expiryDate: '2026-10-22',
    currency: '$',
    amountUntaxed: 25.0,
    amountTax: 0,
    amountTotal: 25.0,
    state: 'active',
    isPaused: true,
    pauseStartedAt: '2026-10-15',
    nextInvoiceDate: '2026-10-22',
    billingPeriodStart: '2026-10-08',
    billingPeriodEnd: '2026-10-15',
    billingStatus: 'paused',
    invoiceCount: 2,
    addons: [],
    events: [
      { id: 5, eventType: 'pause', userName: 'Sarah Staff', details: 'Customer requested maintenance pause during sprint transition', date: '2026-10-15 14:30:00' },
    ],
    renewalIds: [],
  },
  {
    id: 4,
    name: 'SUB-2026-0004',
    saleOrderId: 104,
    saleOrderName: 'SO004',
    partnerId: 1388,
    partnerName: 'Global Logistics Operations',
    planId: 4,
    planName: 'Developer Daily Pass',
    planCode: 'SUB-DEV-D',
    quantity: 5,
    startDate: '2026-10-20',
    expiryDate: '2026-11-20',
    currency: '$',
    amountUntaxed: 25.0,
    amountTax: 0,
    amountTotal: 25.0,
    state: 'active',
    isPaused: false,
    nextInvoiceDate: '2026-10-31',
    billingPeriodStart: '2026-10-30',
    billingPeriodEnd: '2026-10-31',
    billingStatus: 'due',
    invoiceCount: 10,
    addons: [],
    events: [],
    renewalIds: [],
  },
  {
    id: 5,
    name: 'SUB-2026-0005',
    saleOrderId: 105,
    saleOrderName: 'SO005',
    partnerId: 1386,
    partnerName: 'Acme Corporation (Customer)',
    planId: 1,
    planName: 'Professional Monthly Plan',
    planCode: 'SUB-PRO-M',
    quantity: 1,
    startDate: '2026-08-01',
    expiryDate: '2026-09-30',
    currency: '$',
    amountUntaxed: 99.0,
    amountTax: 0,
    amountTotal: 99.0,
    state: 'closed',
    isPaused: false,
    closedAt: '2026-09-30',
    billingPeriodStart: '2026-09-01',
    billingPeriodEnd: '2026-09-30',
    billingStatus: 'closed',
    invoiceCount: 2,
    addons: [],
    events: [
      { id: 6, eventType: 'close', userName: 'Alex Customer', details: 'Contract concluded gracefully upon legacy infrastructure migration', date: '2026-09-30 18:00:00' },
    ],
    renewalIds: [],
  },
];

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 1,
    name: 'INV/2026/0001',
    partnerId: 1386,
    partnerName: 'Acme Corporation (Customer)',
    subscriptionId: 1,
    subscriptionName: 'SUB-2026-0001',
    billingStart: '2026-10-01',
    billingEnd: '2026-10-31',
    invoiceDate: '2026-10-01',
    invoiceDateDue: '2026-10-15',
    state: 'posted',
    paymentState: 'paid',
    amountUntaxed: 128.0,
    amountTax: 0,
    amountTotal: 128.0,
    currency: '$',
    isRecurring: true,
    invoiceOrigin: 'SUB-2026-0001',
    lines: [
      { id: 1, productId: 10, productName: 'Professional Monthly Service', name: 'Professional Monthly Plan [2026-10-01 - 2026-10-31]', quantity: 1, priceUnit: 99.0, priceSubtotal: 99.0 },
      { id: 2, productId: 1, productName: 'SLA Priority Support 24/7', name: 'SLA Priority Support 24/7 [2026-10-01 - 2026-10-31]', quantity: 1, priceUnit: 29.0, priceSubtotal: 29.0 },
    ],
  },
  {
    id: 2,
    name: 'INV/2026/0002',
    partnerId: 1386,
    partnerName: 'Acme Corporation (Customer)',
    subscriptionId: 2,
    subscriptionName: 'SUB-2026-0002',
    billingStart: '2026-01-01',
    billingEnd: '2027-01-01',
    invoiceDate: '2026-01-01',
    invoiceDateDue: '2026-01-31',
    state: 'posted',
    paymentState: 'paid',
    amountUntaxed: 2166.0,
    amountTax: 0,
    amountTotal: 2166.0,
    currency: '$',
    isRecurring: true,
    invoiceOrigin: 'SUB-2026-0002',
    lines: [
      { id: 3, productId: 11, productName: 'Enterprise Annual Service', name: 'Enterprise Annual Tier (x2 seats) [2026-01-01 - 2027-01-01]', quantity: 2, priceUnit: 999.0, priceSubtotal: 1998.0 },
      { id: 4, productId: 2, productName: 'Dedicated Customer Success Manager', name: 'Dedicated Customer Success Manager', quantity: 1, priceUnit: 149.0, priceSubtotal: 149.0 },
      { id: 5, productId: 3, productName: 'Additional 100GB Cloud Storage', name: 'Additional 100GB Cloud Storage', quantity: 1, priceUnit: 19.0, priceSubtotal: 19.0 },
    ],
  },
  {
    id: 3,
    name: 'INV/2026/0003',
    partnerId: 1386,
    partnerName: 'Acme Corporation (Customer)',
    subscriptionId: 1,
    subscriptionName: 'SUB-2026-0001',
    billingStart: '2026-11-01',
    billingEnd: '2026-11-30',
    invoiceDate: '2026-10-31',
    invoiceDateDue: '2026-11-15',
    state: 'draft',
    paymentState: 'not_paid',
    amountUntaxed: 128.0,
    amountTax: 0,
    amountTotal: 128.0,
    currency: '$',
    isRecurring: true,
    invoiceOrigin: 'SUB-2026-0001',
    lines: [
      { id: 6, productId: 10, productName: 'Professional Monthly Service', name: 'Professional Monthly Plan [2026-11-01 - 2026-11-30]', quantity: 1, priceUnit: 99.0, priceSubtotal: 99.0 },
      { id: 7, productId: 1, productName: 'SLA Priority Support 24/7', name: 'SLA Priority Support 24/7 [2026-11-01 - 2026-11-30]', quantity: 1, priceUnit: 29.0, priceSubtotal: 29.0 },
    ],
  },
  {
    id: 4,
    name: 'INV/2026/0004',
    partnerId: 1387,
    partnerName: 'TechStart Innovations Ltd',
    subscriptionId: 3,
    subscriptionName: 'SUB-2026-0003',
    billingStart: '2026-10-08',
    billingEnd: '2026-10-15',
    invoiceDate: '2026-10-08',
    invoiceDateDue: '2026-10-22',
    state: 'posted',
    paymentState: 'paid',
    amountUntaxed: 25.0,
    amountTax: 0,
    amountTotal: 25.0,
    currency: '$',
    isRecurring: true,
    invoiceOrigin: 'SUB-2026-0003',
    lines: [
      { id: 8, productId: 12, productName: 'Basic Weekly Service', name: 'Basic Weekly Starter [2026-10-08 - 2026-10-15]', quantity: 1, priceUnit: 25.0, priceSubtotal: 25.0 },
    ],
  },
  {
    id: 5,
    name: 'INV/2026/0005',
    partnerId: 1388,
    partnerName: 'Global Logistics Operations',
    subscriptionId: 4,
    subscriptionName: 'SUB-2026-0004',
    billingStart: '2026-10-30',
    billingEnd: '2026-10-31',
    invoiceDate: '2026-10-30',
    invoiceDateDue: '2026-11-07',
    state: 'draft',
    paymentState: 'not_paid',
    amountUntaxed: 25.0,
    amountTax: 0,
    amountTotal: 25.0,
    currency: '$',
    isRecurring: true,
    invoiceOrigin: 'SUB-2026-0004',
    lines: [
      { id: 9, productId: 13, productName: 'Developer Daily Service', name: 'Developer Daily Pass (x5 instances) [2026-10-30 - 2026-10-31]', quantity: 5, priceUnit: 5.0, priceSubtotal: 25.0 },
    ],
  },
];

export const INITIAL_QUOTATIONS: Quotation[] = [
  {
    id: 101,
    name: 'SO001',
    partnerId: 1386,
    partnerName: 'Acme Corporation (Customer)',
    planId: 1,
    planName: 'Professional Monthly Plan',
    quantity: 1,
    startDate: '2026-10-01',
    expiryDate: '2026-11-01',
    amountUntaxed: 128.0,
    amountTax: 0,
    amountTotal: 128.0,
    currency: '$',
    state: 'sale',
    dateOrder: '2026-10-01',
    isSubscription: true,
    isAddonChange: false,
    lines: [],
  },
  {
    id: 102,
    name: 'SO002',
    partnerId: 1386,
    partnerName: 'Acme Corporation (Customer)',
    planId: 2,
    planName: 'Enterprise Annual Tier',
    quantity: 2,
    startDate: '2026-01-01',
    expiryDate: '2027-01-01',
    amountUntaxed: 2166.0,
    amountTax: 0,
    amountTotal: 2166.0,
    currency: '$',
    state: 'sale',
    dateOrder: '2026-01-01',
    isSubscription: true,
    isAddonChange: false,
    lines: [],
  },
  {
    id: 103,
    name: 'SO003',
    partnerId: 1387,
    partnerName: 'TechStart Innovations Ltd',
    planId: 3,
    planName: 'Basic Weekly Starter',
    quantity: 1,
    startDate: '2026-10-01',
    expiryDate: '2026-10-22',
    amountUntaxed: 25.0,
    amountTax: 0,
    amountTotal: 25.0,
    currency: '$',
    state: 'sale',
    dateOrder: '2026-10-01',
    isSubscription: true,
    isAddonChange: false,
    lines: [],
  },
  {
    id: 104,
    name: 'SO004',
    partnerId: 1388,
    partnerName: 'Global Logistics Operations',
    planId: 4,
    planName: 'Developer Daily Pass',
    quantity: 5,
    startDate: '2026-10-20',
    expiryDate: '2026-11-20',
    amountUntaxed: 25.0,
    amountTax: 0,
    amountTotal: 25.0,
    currency: '$',
    state: 'sale',
    dateOrder: '2026-10-20',
    isSubscription: true,
    isAddonChange: false,
    lines: [],
  },
  {
    id: 105,
    name: 'SO005',
    partnerId: 1386,
    partnerName: 'Acme Corporation (Customer)',
    planId: 1,
    planName: 'Professional Monthly Plan',
    quantity: 2,
    startDate: '2026-11-01',
    expiryDate: '2026-12-01',
    amountUntaxed: 198.0,
    amountTax: 0,
    amountTotal: 198.0,
    currency: '$',
    state: 'draft',
    dateOrder: '2026-10-31',
    isSubscription: true,
    isAddonChange: false,
    lines: [],
  },
];

/**
 * Cloud Storage Manager
 * Maintains reactive, persistent state in localStorage when running in SaaS cloud/showcase mode.
 */
class CloudStorageStore {
  private STORAGE_KEY = 'subscribo_cloud_v3_state';

  private data: {
    subscriptions: Subscription[];
    invoices: Invoice[];
    plans: SubscriptionPlan[];
    quotations: Quotation[];
    customers: Customer[];
    staff: StaffMember[];
    products: ProductCatalogItem[];
  };

  constructor() {
    this.data = this.load();
  }

  private load() {
    if (typeof window === 'undefined') {
      return {
        subscriptions: INITIAL_SUBSCRIPTIONS,
        invoices: INITIAL_INVOICES,
        plans: INITIAL_PLANS,
        quotations: INITIAL_QUOTATIONS,
        customers: INITIAL_CUSTOMERS,
        staff: INITIAL_STAFF,
        products: INITIAL_PRODUCTS,
      };
    }

    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // Fallback
    }

    return {
      subscriptions: INITIAL_SUBSCRIPTIONS,
      invoices: INITIAL_INVOICES,
      plans: INITIAL_PLANS,
      quotations: INITIAL_QUOTATIONS,
      customers: INITIAL_CUSTOMERS,
      staff: INITIAL_STAFF,
      products: INITIAL_PRODUCTS,
    };
  }

  private save() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.data));
      } catch {
        // quota exceeded or private mode
      }
    }
  }

  // Authentication
  authenticate(login: string, _password?: string): User {
    const cleanLogin = (login || '').trim().toLowerCase();

    if (cleanLogin === 'admin' || cleanLogin.includes('admin')) {
      return {
        id: 2,
        name: 'System Administrator',
        email: 'admin@subscribo.local',
        login: 'admin',
        role: 'admin',
        companyName: 'SUBSCRIBO Enterprise',
      };
    }

    if (cleanLogin.includes('staff')) {
      return {
        id: 1027,
        name: 'Sarah Staff',
        email: cleanLogin.includes('@') ? cleanLogin : 'staff@example.com',
        login: cleanLogin,
        role: 'staff',
        companyName: 'SUBSCRIBO Operations',
      };
    }

    // Default: Customer Portal User
    return {
      id: 1028,
      name: 'Alex Customer',
      email: cleanLogin.includes('@') ? cleanLogin : 'portal.customer@example.com',
      login: cleanLogin || 'portal.customer@example.com',
      role: 'customer',
      partnerId: 1386,
      companyName: 'Acme Corporation (Customer)',
    };
  }

  // Subscriptions
  getSubscriptions(partnerId?: number, filterState?: string): Subscription[] {
    let list = [...this.data.subscriptions];
    if (partnerId) {
      list = list.filter((s) => s.partnerId === partnerId);
    }
    if (filterState && filterState !== 'all') {
      if (filterState === 'paused') {
        list = list.filter((s) => s.isPaused);
      } else {
        list = list.filter((s) => s.state === filterState);
      }
    }
    return list;
  }

  getSubscription(id: number): Subscription | null {
    return this.data.subscriptions.find((s) => s.id === id) || null;
  }

  pauseSubscription(id: number, reason: string = 'Pause request'): boolean {
    const sub = this.data.subscriptions.find((s) => s.id === id);
    if (sub) {
      sub.isPaused = true;
      sub.pauseStartedAt = new Date().toISOString().split('T')[0];
      sub.billingStatus = 'paused';
      sub.events.unshift({
        id: Date.now(),
        eventType: 'pause',
        userName: 'SaaS Operator',
        details: reason,
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });
      this.save();
      return true;
    }
    return false;
  }

  resumeSubscription(id: number, reason: string = 'Resume request'): boolean {
    const sub = this.data.subscriptions.find((s) => s.id === id);
    if (sub) {
      sub.isPaused = false;
      sub.pauseStartedAt = undefined;
      sub.billingStatus = 'ready';
      sub.events.unshift({
        id: Date.now(),
        eventType: 'resume',
        userName: 'SaaS Operator',
        details: reason,
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });
      this.save();
      return true;
    }
    return false;
  }

  closeSubscription(id: number, reason: string = 'Cancellation'): boolean {
    const sub = this.data.subscriptions.find((s) => s.id === id);
    if (sub) {
      sub.state = 'closed';
      sub.isPaused = false;
      sub.closedAt = new Date().toISOString().split('T')[0];
      sub.billingStatus = 'closed';
      sub.events.unshift({
        id: Date.now(),
        eventType: 'close',
        userName: 'SaaS Operator',
        details: reason,
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });
      this.save();
      return true;
    }
    return false;
  }

  renewSubscription(id: number): any {
    const orig = this.data.subscriptions.find((s) => s.id === id);
    if (!orig) return null;

    const newId = this.data.subscriptions.length + 1;
    const newName = `SUB-2026-000${newId}`;
    const newSub: Subscription = {
      ...orig,
      id: newId,
      name: newName,
      state: 'active',
      isPaused: false,
      renewedFromId: orig.id,
      renewalIds: [],
      startDate: new Date().toISOString().split('T')[0],
      events: [
        {
          id: Date.now(),
          eventType: 'renewal',
          userName: 'Renewal Automation',
          details: `Renewed successfully from parent contract ${orig.name}`,
          date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        },
      ],
    };
    orig.renewalIds.push(newId);
    this.data.subscriptions.unshift(newSub);
    this.save();
    return { id: newId, name: newName };
  }

  requestAddon(addonId: number): any {
    for (const sub of this.data.subscriptions) {
      const match = sub.addons.find((a) => a.id === addonId);
      if (match) {
        match.isActive = true;
        match.activatedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
        this.save();
        return { success: true };
      }
    }
    return { success: true };
  }

  disableAddon(addonId: number, reason: string): boolean {
    for (const sub of this.data.subscriptions) {
      const match = sub.addons.find((a) => a.id === addonId);
      if (match) {
        match.isActive = false;
        match.disabledAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
        sub.events.unshift({
          id: Date.now(),
          eventType: 'addon_disabled',
          userName: 'Customer Portal',
          details: `Disabled ${match.name}: ${reason}`,
          date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        });
        this.save();
        return true;
      }
    }
    return false;
  }

  // Invoices & Billing
  getInvoices(filters?: { subscriptionId?: number; partnerId?: number; state?: string }): Invoice[] {
    let list = [...this.data.invoices];
    if (filters?.partnerId) {
      list = list.filter((i) => i.partnerId === filters.partnerId);
    }
    if (filters?.subscriptionId) {
      list = list.filter((i) => i.subscriptionId === filters.subscriptionId);
    }
    if (filters?.state) {
      list = list.filter((i) => i.state === filters.state);
    }
    return list;
  }

  getInvoice(id: number): Invoice | null {
    return this.data.invoices.find((i) => i.id === id) || null;
  }

  generateSubscriptionInvoice(subscriptionId: number): { id: number; name: string } {
    const sub = this.data.subscriptions.find((s) => s.id === subscriptionId);
    const newId = this.data.invoices.length + 1;
    const invName = `INV/2026/000${newId}`;
    const today = new Date().toISOString().split('T')[0];

    const lines = [
      {
        id: Date.now(),
        productId: sub?.planId || 10,
        productName: sub?.planName || 'Recurring Subscription Service',
        name: `${sub?.planName || 'Subscription'} [Billing Period ${today}]`,
        quantity: sub?.quantity || 1,
        priceUnit: sub?.amountTotal || 99.0,
        priceSubtotal: sub?.amountTotal || 99.0,
      },
    ];

    const newInvoice: Invoice = {
      id: newId,
      name: invName,
      partnerId: sub?.partnerId || 1386,
      partnerName: sub?.partnerName || 'Acme Corporation (Customer)',
      subscriptionId: sub?.id,
      subscriptionName: sub?.name,
      billingStart: today,
      billingEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      invoiceDate: today,
      invoiceDateDue: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      state: 'draft',
      paymentState: 'not_paid',
      amountUntaxed: sub?.amountUntaxed || 99.0,
      amountTax: sub?.amountTax || 0,
      amountTotal: sub?.amountTotal || 99.0,
      currency: sub?.currency || '$',
      isRecurring: true,
      invoiceOrigin: sub?.name || 'Manual Billing Run',
      lines,
    };

    if (sub) {
      sub.invoiceCount = (sub.invoiceCount || 0) + 1;
      sub.events.unshift({
        id: Date.now(),
        eventType: 'invoice_generated',
        userName: 'Manual Billing Action',
        details: `Generated recurring invoice ${invName} ($${newInvoice.amountTotal})`,
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });
    }

    this.data.invoices.unshift(newInvoice);
    this.save();
    return { id: newId, name: invName };
  }

  postInvoice(id: number): boolean {
    const inv = this.data.invoices.find((i) => i.id === id);
    if (inv) {
      inv.state = 'posted';
      inv.paymentState = 'paid';
      this.save();
      return true;
    }
    return false;
  }

  getUpcomingBilling(partnerId?: number): UpcomingBillingItem[] {
    const subs = this.getSubscriptions(partnerId);
    const today = new Date().toISOString().split('T')[0];

    return subs.map((s): UpcomingBillingItem => {
      const isDue = Boolean(s.nextInvoiceDate && s.nextInvoiceDate <= today && s.state === 'active' && !s.isPaused);
      let status: 'due' | 'upcoming' | 'paused' | 'closed' = 'upcoming';
      if (s.state === 'closed') status = 'closed';
      else if (s.isPaused) status = 'paused';
      else if (isDue) status = 'due';

      return {
        subscriptionId: s.id,
        subscriptionName: s.name,
        partnerId: s.partnerId,
        partnerName: s.partnerName,
        planName: s.planName,
        billingInterval: s.planCode.toLowerCase().includes('year') ? 'Yearly' :
                         s.planCode.toLowerCase().includes('week') ? 'Weekly' :
                         s.planCode.toLowerCase().includes('day') ? 'Daily' : 'Monthly',
        billingStart: s.billingPeriodStart || s.startDate,
        billingEnd: s.billingPeriodEnd || s.expiryDate,
        nextInvoiceDate: s.nextInvoiceDate || s.startDate,
        estimatedAmount: s.amountTotal,
        currency: s.currency,
        isDue,
        status,
      };
    });
  }

  getBillingStats(): BillingStats {
    const invoices = this.getInvoices();
    const upcoming = this.getUpcomingBilling();

    const totalInvoicedAmount = invoices.reduce((sum, inv) => sum + inv.amountTotal, 0);
    const paidInvoices = invoices.filter((inv) => inv.paymentState === 'paid');
    const draftInvoices = invoices.filter((inv) => inv.state === 'draft');
    const dueSoon = upcoming.filter((u) => u.isDue);
    const mrr = upcoming
      .filter((u) => u.status === 'upcoming' || u.status === 'due')
      .reduce((sum, u) => sum + u.estimatedAmount, 0);

    return {
      totalInvoicedAmount,
      totalInvoiceCount: invoices.length,
      paidInvoiceCount: paidInvoices.length,
      draftInvoiceCount: draftInvoices.length,
      dueSoonCount: dueSoon.length,
      upcomingMonthlyRevenue: mrr,
    };
  }

  // Plans, Quotations, Customers, Staff, Products
  getPlans(): SubscriptionPlan[] {
    return this.data.plans;
  }

  getQuotations(partnerId?: number): Quotation[] {
    let list = [...this.data.quotations];
    if (partnerId) {
      list = list.filter((q) => q.partnerId === partnerId);
    }
    return list;
  }

  confirmQuotation(id: number): boolean {
    const q = this.data.quotations.find((item) => item.id === id);
    if (q) {
      q.state = 'sale';
      this.save();
      return true;
    }
    return false;
  }

  getCustomers(): Customer[] {
    return this.data.customers;
  }

  getStaff(): StaffMember[] {
    return this.data.staff;
  }

  getProducts(): ProductCatalogItem[] {
    return this.data.products;
  }

  getDashboardStats(role?: UserRole, partnerId?: number): DashboardStats {
    const subs = this.getSubscriptions(role === 'customer' ? partnerId : undefined);
    const quotes = this.getQuotations(role === 'customer' ? partnerId : undefined);

    const activeSubs = subs.filter((s) => s.state === 'active' && !s.isPaused);
    const pausedSubs = subs.filter((s) => s.isPaused);
    const draftQuotes = quotes.filter((q) => q.state === 'draft' || q.state === 'sent');
    const mrv = activeSubs.reduce((acc, curr) => acc + curr.amountTotal, 0);

    return {
      totalSubscriptions: subs.length,
      activeSubscriptions: activeSubs.length,
      pausedSubscriptions: pausedSubs.length,
      draftQuotations: draftQuotes.length,
      monthlyRecurringValue: mrv,
      totalCustomers: subs.length > 0 ? new Set(subs.map((s) => s.partnerId)).size : 1,
      expiringSoonCount: subs.filter((s) => s.state === 'active').length,
    };
  }
}

export const cloudStore = new CloudStorageStore();
