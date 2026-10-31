import type {
  User,
  UserRole,
  Subscription,
  SubscriptionPlan,
  Quotation,
  Customer,
  StaffMember,
  ProductCatalogItem,
  DashboardStats,
  Invoice,
  InvoiceLine,
  UpcomingBillingItem,
  BillingStats,
} from '../types';

const ODOO_DB = 'subscribo_phase1_test_20261031';

class OdooApiService {
  private rpcId = 1;

  private async jsonRpc(url: string, params: Record<string, unknown>): Promise<any> {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params,
        id: this.rpcId++,
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (data.error) {
      const msg = data.error.data?.message || data.error.message || 'Odoo RPC Error';
      throw new Error(msg);
    }
    return data.result;
  }

  // 1. Authentication
  async login(login: string, password: string): Promise<User> {
    const result = await this.jsonRpc('/web/session/authenticate', {
      db: ODOO_DB,
      login,
      password,
    });

    let role: UserRole = 'customer';
    if (login === 'admin' || (result.is_admin ?? false)) {
      role = 'admin';
    } else if (login.includes('staff')) {
      role = 'staff';
    } else {
      role = 'customer';
    }

    const user: User = {
      id: result.uid,
      name: result.name || login,
      email: login.includes('@') ? login : `${login}@subscribo.local`,
      login,
      role,
      partnerId: result.partner_id,
      companyName: result.company_name || 'Subscribo Corp',
    };

    localStorage.setItem('subscribo_user', JSON.stringify(user));
    return user;
  }

  async logout(): Promise<void> {
    try {
      await this.jsonRpc('/web/session/destroy', {});
    } catch {
      // ignore
    }
    localStorage.removeItem('subscribo_user');
  }

  getCurrentUser(): User | null {
    const saved = localStorage.getItem('subscribo_user');
    if (!saved) return null;
    try {
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }

  // Helper to execute call_kw
  private async callKw(model: string, method: string, args: unknown[] = [], kwargs: Record<string, unknown> = {}): Promise<any> {
    return this.jsonRpc('/web/dataset/call_kw', {
      model,
      method,
      args,
      kwargs,
    });
  }

  // 2. Subscriptions
  async getSubscriptions(filterState?: string): Promise<Subscription[]> {
    const domain: any[] = [];
    if (filterState && filterState !== 'all') {
      if (filterState === 'paused') {
        domain.push(['is_paused', '=', true]);
      } else {
        domain.push(['state', '=', filterState]);
      }
    }

    const records = await this.callKw('subscribo.subscription', 'search_read', [domain], {
      fields: [
        'id', 'name', 'sale_order_id', 'partner_id', 'plan_id', 'quantity',
        'start_date', 'expiry_date', 'amount_untaxed', 'amount_tax', 'amount_total',
        'currency_id', 'state', 'is_paused', 'pause_started_at', 'renewed_from_id',
        'renewal_ids', 'closed_at', 'addon_ids', 'event_ids',
        'next_invoice_date', 'billing_period_start', 'billing_period_end', 'billing_status', 'invoice_count'
      ],
      order: 'id desc',
    });

    return records.map((r: any): Subscription => ({
      id: r.id,
      name: r.name,
      saleOrderId: r.sale_order_id ? r.sale_order_id[0] : 0,
      saleOrderName: r.sale_order_id ? r.sale_order_id[1] : '',
      partnerId: r.partner_id ? r.partner_id[0] : 0,
      partnerName: r.partner_id ? r.partner_id[1] : 'Unknown Customer',
      planId: r.plan_id ? r.plan_id[0] : 0,
      planName: r.plan_id ? r.plan_id[1] : 'Standard Plan',
      planCode: r.plan_id ? (r.plan_id[1].split(' ')[0] || 'PLAN') : 'PLAN',
      quantity: r.quantity || 1,
      startDate: r.start_date || '',
      expiryDate: r.expiry_date || '',
      currency: r.currency_id ? r.currency_id[1] : 'INR',
      amountUntaxed: r.amount_untaxed || 0,
      amountTax: r.amount_tax || 0,
      amountTotal: r.amount_total || 0,
      state: r.state || 'draft',
      isPaused: Boolean(r.is_paused),
      pauseStartedAt: r.pause_started_at,
      renewedFromId: r.renewed_from_id ? r.renewed_from_id[0] : undefined,
      renewalIds: r.renewal_ids || [],
      closedAt: r.closed_at,
      nextInvoiceDate: r.next_invoice_date || undefined,
      billingPeriodStart: r.billing_period_start || undefined,
      billingPeriodEnd: r.billing_period_end || undefined,
      billingStatus: r.billing_status || undefined,
      invoiceCount: r.invoice_count || 0,
      addons: [],
      events: [],
    }));
  }

  async getSubscription(id: number): Promise<Subscription | null> {
    const list = await this.callKw('subscribo.subscription', 'search_read', [[['id', '=', id]]], {
      fields: [
        'id', 'name', 'sale_order_id', 'partner_id', 'plan_id', 'quantity',
        'start_date', 'expiry_date', 'amount_untaxed', 'amount_tax', 'amount_total',
        'currency_id', 'state', 'is_paused', 'pause_started_at', 'renewed_from_id',
        'renewal_ids', 'closed_at', 'addon_ids', 'event_ids'
      ],
    });
    if (!list || list.length === 0) return null;
    const r = list[0];

    // Fetch addons
    let addons: any[] = [];
    if (r.addon_ids && r.addon_ids.length > 0) {
      addons = await this.callKw('subscribo.subscription.addon', 'read', [r.addon_ids], {
        fields: ['id', 'product_id', 'name', 'price', 'is_active', 'activated_at', 'disabled_at', 'pending_change_order_id'],
      });
    }

    // Fetch events
    let events: any[] = [];
    if (r.event_ids && r.event_ids.length > 0) {
      events = await this.callKw('subscribo.subscription.event', 'read', [r.event_ids], {
        fields: ['id', 'event_type', 'user_id', 'details', 'date'],
        order: 'id desc',
      });
    }

    return {
      id: r.id,
      name: r.name,
      saleOrderId: r.sale_order_id ? r.sale_order_id[0] : 0,
      saleOrderName: r.sale_order_id ? r.sale_order_id[1] : '',
      partnerId: r.partner_id ? r.partner_id[0] : 0,
      partnerName: r.partner_id ? r.partner_id[1] : 'Unknown Customer',
      planId: r.plan_id ? r.plan_id[0] : 0,
      planName: r.plan_id ? r.plan_id[1] : 'Standard Plan',
      planCode: r.plan_id ? r.plan_id[1].split(' ')[0] : 'PLAN',
      quantity: r.quantity || 1,
      startDate: r.start_date || '',
      expiryDate: r.expiry_date || '',
      currency: r.currency_id ? r.currency_id[1] : 'INR',
      amountUntaxed: r.amount_untaxed || 0,
      amountTax: r.amount_tax || 0,
      amountTotal: r.amount_total || 0,
      state: r.state || 'draft',
      isPaused: Boolean(r.is_paused),
      pauseStartedAt: r.pause_started_at,
      renewedFromId: r.renewed_from_id ? r.renewed_from_id[0] : undefined,
      renewalIds: r.renewal_ids || [],
      closedAt: r.closed_at,
      addons: addons.map((a: any) => ({
        id: a.id,
        productId: a.product_id ? a.product_id[0] : 0,
        name: a.name || (a.product_id ? a.product_id[1] : 'Add-on'),
        price: a.price || 0,
        isActive: Boolean(a.is_active),
        activatedAt: a.activated_at,
        disabledAt: a.disabled_at,
        pendingChangeOrderId: a.pending_change_order_id ? a.pending_change_order_id[0] : undefined,
      })),
      events: events.map((e: any) => ({
        id: e.id,
        eventType: e.event_type,
        userName: e.user_id ? e.user_id[1] : 'System',
        details: e.details || '',
        date: e.date || '',
      })),
    };
  }

  // Subscription Actions
  async pauseSubscription(id: number, reason: string = 'Customer pause request'): Promise<boolean> {
    await this.callKw('subscribo.subscription', 'action_pause', [[id], reason]);
    return true;
  }

  async resumeSubscription(id: number, reason: string = 'Customer resume request'): Promise<boolean> {
    await this.callKw('subscribo.subscription', 'action_resume', [[id], reason]);
    return true;
  }

  async closeSubscription(id: number, reason: string = 'Customer cancellation'): Promise<boolean> {
    await this.callKw('subscribo.subscription', 'action_close', [[id], reason]);
    return true;
  }

  async renewSubscription(id: number, startDate?: string, expiryDate?: string): Promise<any> {
    return await this.callKw('subscribo.subscription', 'action_renew', [[id], startDate, expiryDate]);
  }

  async requestAddon(addonId: number): Promise<any> {
    return await this.callKw('subscribo.subscription.addon', 'action_request_enable', [[addonId]]);
  }

  async disableAddon(addonId: number, reason: string): Promise<boolean> {
    await this.callKw('subscribo.subscription.addon', 'action_disable', [[addonId], reason]);
    return true;
  }

  // 3. Plans
  async getPlans(): Promise<SubscriptionPlan[]> {
    const records = await this.callKw('subscribo.plan', 'search_read', [[]], {
      fields: ['id', 'name', 'code', 'price', 'currency_id', 'billing_interval', 'interval_count', 'active', 'description', 'product_id', 'addon_product_ids'],
    });

    return records.map((r: any): SubscriptionPlan => ({
      id: r.id,
      name: r.name,
      code: r.code,
      price: r.price,
      currency: r.currency_id ? r.currency_id[1] : 'INR',
      billingInterval: r.billing_interval || 'monthly',
      intervalCount: r.interval_count || 1,
      active: Boolean(r.active),
      description: r.description || '',
      productId: r.product_id ? r.product_id[0] : 0,
      productName: r.product_id ? r.product_id[1] : '',
      addonProductIds: r.addon_product_ids || [],
    }));
  }

  // 4. Quotations
  async getQuotations(): Promise<Quotation[]> {
    const domain = [['subscribo_is_subscription', '=', true]];
    const orders = await this.callKw('sale.order', 'search_read', [domain], {
      fields: [
        'id', 'name', 'partner_id', 'subscribo_plan_id', 'subscribo_quantity',
        'subscribo_start_date', 'subscribo_expiry_date', 'amount_untaxed',
        'amount_tax', 'amount_total', 'currency_id', 'state', 'date_order',
        'subscribo_is_subscription', 'subscribo_is_addon_change', 'order_line'
      ],
      order: 'id desc',
    });

    return orders.map((o: any): Quotation => ({
      id: o.id,
      name: o.name,
      partnerId: o.partner_id ? o.partner_id[0] : 0,
      partnerName: o.partner_id ? o.partner_id[1] : 'Customer',
      planId: o.subscribo_plan_id ? o.subscribo_plan_id[0] : undefined,
      planName: o.subscribo_plan_id ? o.subscribo_plan_id[1] : undefined,
      quantity: o.subscribo_quantity || 1,
      startDate: o.subscribo_start_date,
      expiryDate: o.subscribo_expiry_date,
      amountUntaxed: o.amount_untaxed || 0,
      amountTax: o.amount_tax || 0,
      amountTotal: o.amount_total || 0,
      currency: o.currency_id ? o.currency_id[1] : 'INR',
      state: o.state || 'draft',
      dateOrder: o.date_order || '',
      isSubscription: Boolean(o.subscribo_is_subscription),
      isAddonChange: Boolean(o.subscribo_is_addon_change),
      lines: [],
    }));
  }

  async confirmQuotation(id: number): Promise<boolean> {
    await this.callKw('sale.order', 'action_confirm', [[id]]);
    return true;
  }

  // 5. Customers
  async getCustomers(): Promise<Customer[]> {
    const partners = await this.callKw('res.partner', 'search_read', [[['is_company', '=', true]]], {
      fields: ['id', 'name', 'email', 'phone', 'company_name', 'street', 'city'],
      limit: 25,
    });

    return partners.map((p: any): Customer => ({
      id: p.id,
      name: p.name,
      email: p.email || 'customer@example.com',
      phone: p.phone,
      companyName: p.company_name || p.name,
      street: p.street,
      city: p.city,
      subscriptionCount: 1,
      activeSubscriptions: 1,
    }));
  }

  // 6. Staff
  async getStaff(): Promise<StaffMember[]> {
    const users = await this.callKw('res.users', 'search_read', [[['share', '=', false]]], {
      fields: ['id', 'name', 'login', 'email', 'active'],
      limit: 20,
    });

    return users.map((u: any): StaffMember => ({
      id: u.id,
      name: u.name,
      login: u.login,
      email: u.email || `${u.login}@subscribo.local`,
      role: u.login === 'admin' ? 'Administrator' : 'SUBSCRIBO Staff',
      active: Boolean(u.active),
    }));
  }

  // 7. Products and Addons
  async getProducts(): Promise<ProductCatalogItem[]> {
    const products = await this.callKw('product.product', 'search_read', [[]], {
      fields: ['id', 'name', 'default_code', 'list_price', 'type'],
      limit: 50,
    });

    return products.map((p: any): ProductCatalogItem => ({
      id: p.id,
      name: p.name,
      code: p.default_code || '',
      listPrice: p.list_price || 0,
      type: p.type || 'service',
      isService: p.type === 'service',
      isAddon: (p.default_code || '').includes('SLA') || (p.name || '').toLowerCase().includes('support') || (p.name || '').toLowerCase().includes('add-on'),
    }));
  }

  // 8. Aggregated Stats
  async getDashboardStats(_role?: UserRole): Promise<DashboardStats> {
    const subs = await this.getSubscriptions();
    const quotes = await this.getQuotations();

    const activeSubs = subs.filter(s => s.state === 'active' && !s.isPaused);
    const pausedSubs = subs.filter(s => s.isPaused);
    const draftQuotes = quotes.filter(q => q.state === 'draft' || q.state === 'sent');

    const mrv = activeSubs.reduce((acc, curr) => acc + curr.amountTotal, 0);

    return {
      totalSubscriptions: subs.length,
      activeSubscriptions: activeSubs.length,
      pausedSubscriptions: pausedSubs.length,
      draftQuotations: draftQuotes.length,
      monthlyRecurringValue: mrv,
      totalCustomers: subs.length > 0 ? new Set(subs.map(s => s.partnerId)).size : 1,
      expiringSoonCount: subs.filter(s => s.state === 'active').length,
    };
  }

  // 9. Invoices & Recurring Billing
  async getInvoices(filters?: { subscriptionId?: number; partnerId?: number; state?: string }): Promise<Invoice[]> {
    const domain: any[] = [['move_type', '=', 'out_invoice']];
    if (filters?.subscriptionId) {
      domain.push(['subscribo_subscription_id', '=', filters.subscriptionId]);
    }
    if (filters?.partnerId) {
      domain.push(['partner_id', '=', filters.partnerId]);
    }
    if (filters?.state) {
      domain.push(['state', '=', filters.state]);
    }

    const records = await this.callKw('account.move', 'search_read', [domain], {
      fields: [
        'id', 'name', 'partner_id', 'subscribo_subscription_id', 'subscribo_billing_start',
        'subscribo_billing_end', 'invoice_date', 'invoice_date_due', 'state', 'payment_state',
        'amount_untaxed', 'amount_tax', 'amount_total', 'currency_id', 'subscribo_is_recurring',
        'invoice_origin', 'invoice_line_ids',
      ],
      order: 'id desc',
      limit: 100,
    });

    return records.map((r: any): Invoice => ({
      id: r.id,
      name: r.name || 'Draft Invoice',
      partnerId: r.partner_id ? r.partner_id[0] : 0,
      partnerName: r.partner_id ? r.partner_id[1] : 'Unknown Customer',
      subscriptionId: r.subscribo_subscription_id ? r.subscribo_subscription_id[0] : undefined,
      subscriptionName: r.subscribo_subscription_id ? r.subscribo_subscription_id[1] : undefined,
      billingStart: r.subscribo_billing_start || undefined,
      billingEnd: r.subscribo_billing_end || undefined,
      invoiceDate: r.invoice_date || '',
      invoiceDateDue: r.invoice_date_due || undefined,
      state: r.state || 'draft',
      paymentState: r.payment_state || 'not_paid',
      amountUntaxed: r.amount_untaxed || 0,
      amountTax: r.amount_tax || 0,
      amountTotal: r.amount_total || 0,
      currency: r.currency_id ? r.currency_id[1] : 'INR',
      isRecurring: Boolean(r.subscribo_is_recurring),
      invoiceOrigin: r.invoice_origin || '',
      lines: [],
    }));
  }

  async getInvoice(id: number): Promise<Invoice | null> {
    const moves = await this.callKw('account.move', 'search_read', [[['id', '=', id]]], {
      fields: [
        'id', 'name', 'partner_id', 'subscribo_subscription_id', 'subscribo_billing_start',
        'subscribo_billing_end', 'invoice_date', 'invoice_date_due', 'state', 'payment_state',
        'amount_untaxed', 'amount_tax', 'amount_total', 'currency_id', 'subscribo_is_recurring',
        'invoice_origin', 'invoice_line_ids',
      ],
    });
    if (!moves || moves.length === 0) return null;
    const r = moves[0];

    let lines: InvoiceLine[] = [];
    if (r.invoice_line_ids && r.invoice_line_ids.length > 0) {
      const lineRecs = await this.callKw('account.move.line', 'read', [r.invoice_line_ids], {
        fields: ['id', 'product_id', 'name', 'quantity', 'price_unit', 'price_subtotal'],
      });
      lines = lineRecs.map((l: any): InvoiceLine => ({
        id: l.id,
        productId: l.product_id ? l.product_id[0] : 0,
        productName: l.product_id ? l.product_id[1] : (l.name || 'Service'),
        name: l.name || '',
        quantity: l.quantity || 1,
        priceUnit: l.price_unit || 0,
        priceSubtotal: l.price_subtotal || 0,
      }));
    }

    return {
      id: r.id,
      name: r.name || 'Draft Invoice',
      partnerId: r.partner_id ? r.partner_id[0] : 0,
      partnerName: r.partner_id ? r.partner_id[1] : 'Unknown Customer',
      subscriptionId: r.subscribo_subscription_id ? r.subscribo_subscription_id[0] : undefined,
      subscriptionName: r.subscribo_subscription_id ? r.subscribo_subscription_id[1] : undefined,
      billingStart: r.subscribo_billing_start || undefined,
      billingEnd: r.subscribo_billing_end || undefined,
      invoiceDate: r.invoice_date || '',
      invoiceDateDue: r.invoice_date_due || undefined,
      state: r.state || 'draft',
      paymentState: r.payment_state || 'not_paid',
      amountUntaxed: r.amount_untaxed || 0,
      amountTax: r.amount_tax || 0,
      amountTotal: r.amount_total || 0,
      currency: r.currency_id ? r.currency_id[1] : 'INR',
      isRecurring: Boolean(r.subscribo_is_recurring),
      invoiceOrigin: r.invoice_origin || '',
      lines,
    };
  }

  async generateSubscriptionInvoice(subscriptionId: number): Promise<{ id: number; name: string }> {
    const res = await this.callKw('subscribo.subscription', 'action_generate_invoice', [[subscriptionId]]);
    return { id: res.res_id, name: res.name || 'New Invoice' };
  }

  async postInvoice(id: number): Promise<boolean> {
    await this.callKw('account.move', 'action_post', [[id]]);
    return true;
  }

  async getUpcomingBilling(): Promise<UpcomingBillingItem[]> {
    const subs = await this.getSubscriptions();
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

  async getBillingStats(): Promise<BillingStats> {
    const invoices = await this.getInvoices();
    const upcoming = await this.getUpcomingBilling();

    const totalInvoicedAmount = invoices.reduce((sum, inv) => sum + inv.amountTotal, 0);
    const paidInvoices = invoices.filter(inv => inv.paymentState === 'paid');
    const draftInvoices = invoices.filter(inv => inv.state === 'draft');
    const dueSoon = upcoming.filter(u => u.isDue);
    const mrr = upcoming
      .filter(u => u.status === 'upcoming' || u.status === 'due')
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
}

export const odooApi = new OdooApiService();

