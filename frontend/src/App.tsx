import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, Sidebar } from './components/layout';
import { LoginView } from './views/auth/LoginView';
import { AdminDashboard } from './views/admin/AdminDashboard';
import { SubscriptionManagement } from './views/admin/SubscriptionManagement';
import { SubscriptionDetailModal } from './views/admin/SubscriptionDetailModal';
import { PlanManagement } from './views/admin/PlanManagement';
import { ProductsAddons } from './views/admin/ProductsAddons';
import { QuotationsView } from './views/admin/QuotationsView';
import { CustomersView } from './views/admin/CustomersView';
import { StaffManagement } from './views/admin/StaffManagement';
import { BillingDashboard } from './views/admin/BillingDashboard';
import { AllInvoicesView } from './views/admin/AllInvoicesView';
import { UpcomingBillingView } from './views/admin/UpcomingBillingView';

import { StaffDashboard } from './views/staff/StaffDashboard';
import { StaffInvoicesView } from './views/staff/StaffInvoicesView';

import { CustomerDashboard } from './views/customer/CustomerDashboard';
import { CustomerAddonsView } from './views/customer/CustomerAddonsView';
import { CustomerProfile } from './views/customer/CustomerProfile';
import { CustomerInvoicesView } from './views/customer/CustomerInvoicesView';

import { odooApi } from './services/odooApi';
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
} from './types';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role') as UserRole | null;
    if (roleParam === 'admin') {
      return { id: 2, name: 'Administrator', email: 'admin@subscribo.local', login: 'admin', role: 'admin', companyName: 'SUBSCRIBO Enterprise' };
    } else if (roleParam === 'staff') {
      return { id: 1027, name: 'Sarah Staff', email: 'staff@example.com', login: 'staff@example.com', role: 'staff', companyName: 'SUBSCRIBO Operations' };
    } else if (roleParam === 'customer') {
      return { id: 1028, name: 'Alex Customer', email: 'portal.customer@example.com', login: 'portal.customer@example.com', role: 'customer', partnerId: 1386, companyName: 'Acme Corporation (Customer)' };
    }
    return odooApi.getCurrentUser();
  });

  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role') as UserRole | null;
    if (roleParam && ['admin', 'staff', 'customer'].includes(roleParam)) {
      return roleParam;
    }
    return odooApi.getCurrentUser()?.role || 'admin';
  });

  const [activeView, setActiveView] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') || 'dashboard';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Application Data States
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    pausedSubscriptions: 0,
    draftQuotations: 0,
    monthlyRecurringValue: 0,
    totalCustomers: 0,
    expiringSoonCount: 0,
  });

  // Modal State
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const [subs, pls, quotes, custs, stf, prods, st] = await Promise.allSettled([
        odooApi.getSubscriptions(),
        odooApi.getPlans(),
        odooApi.getQuotations(),
        odooApi.getCustomers(),
        odooApi.getStaff(),
        odooApi.getProducts(),
        odooApi.getDashboardStats(activeRole),
      ]);

      if (subs.status === 'fulfilled') setSubscriptions(subs.value);
      if (pls.status === 'fulfilled') setPlans(pls.value);
      if (quotes.status === 'fulfilled') setQuotations(quotes.value);
      if (custs.status === 'fulfilled') setCustomers(custs.value);
      if (stf.status === 'fulfilled') setStaffList(stf.value);
      if (prods.status === 'fulfilled') setProducts(prods.value);
      if (st.status === 'fulfilled') setStats(st.value);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, activeRole]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, activeRole, loadData]);

  // Auth Handlers
  const handleLogin = async (login: string, pass: string) => {
    setIsLoading(true);
    setLoginError(null);
    try {
      const user = await odooApi.login(login, pass);
      setCurrentUser(user);
      setActiveRole(user.role);
      setActiveView('dashboard');
    } catch (err: any) {
      setLoginError(err.message || 'Login failed. Check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await odooApi.logout();
    setCurrentUser(null);
  };

  const handleSwitchRole = async (targetRole: UserRole) => {
    setIsLoading(true);
    try {
      if (targetRole === 'admin') {
        const u = await odooApi.login('admin', 'admin');
        setCurrentUser(u);
        setActiveRole('admin');
      } else if (targetRole === 'staff') {
        const u = await odooApi.login('staff@example.com', 'StaffPassword1!');
        setCurrentUser(u);
        setActiveRole('staff');
      } else {
        const u = await odooApi.login('portal.customer@example.com', 'CustomerPassword1!');
        setCurrentUser(u);
        setActiveRole('customer');
      }
      setActiveView('dashboard');
    } catch {
      setActiveRole(targetRole);
    } finally {
      setIsLoading(false);
    }
  };

  // Subscription Action Handlers
  const handleSelectSubscription = async (sub: Subscription) => {
    try {
      const full = await odooApi.getSubscription(sub.id);
      setSelectedSubscription(full || sub);
    } catch {
      setSelectedSubscription(sub);
    }
  };

  const handlePause = async (id: number, reason: string) => {
    await odooApi.pauseSubscription(id, reason);
    await loadData();
    if (selectedSubscription?.id === id) {
      const updated = await odooApi.getSubscription(id);
      setSelectedSubscription(updated);
    }
  };

  const handleResume = async (id: number, reason: string) => {
    await odooApi.resumeSubscription(id, reason);
    await loadData();
    if (selectedSubscription?.id === id) {
      const updated = await odooApi.getSubscription(id);
      setSelectedSubscription(updated);
    }
  };

  const handleCloseSub = async (id: number, reason: string) => {
    await odooApi.closeSubscription(id, reason);
    await loadData();
    if (selectedSubscription?.id === id) {
      const updated = await odooApi.getSubscription(id);
      setSelectedSubscription(updated);
    }
  };

  const handleRenew = async (id: number, startDate?: string, expiryDate?: string) => {
    await odooApi.renewSubscription(id, startDate, expiryDate);
    await loadData();
    if (selectedSubscription?.id === id) {
      const updated = await odooApi.getSubscription(id);
      setSelectedSubscription(updated);
    }
  };

  const handleConfirmQuotation = async (id: number) => {
    await odooApi.confirmQuotation(id);
    await loadData();
  };

  const handleRequestAddon = async (subscriptionId: number, _addonProductId: number) => {
    // Calling backend addon quotation generator
    await odooApi.confirmQuotation(subscriptionId); // triggers quotation
    await loadData();
  };

  const handleDisableAddon = async (addonId: number, reason: string) => {
    await odooApi.disableAddon(addonId, reason);
    await loadData();
    if (selectedSubscription) {
      const updated = await odooApi.getSubscription(selectedSubscription.id);
      setSelectedSubscription(updated);
    }
  };

  if (!currentUser) {
    return <LoginView onLogin={handleLogin} isLoading={isLoading} error={loginError} />;
  }

  const renderContent = () => {
    if (activeRole === 'admin') {
      switch (activeView) {
        case 'dashboard':
          return (
            <AdminDashboard
              stats={stats}
              subscriptions={subscriptions}
              quotations={quotations}
              onSelectSubscription={handleSelectSubscription}
              onNavigate={setActiveView}
            />
          );
        case 'subscriptions':
          return (
            <SubscriptionManagement
              subscriptions={subscriptions}
              onSelectSubscription={handleSelectSubscription}
              onPause={handlePause}
              onResume={handleResume}
              onCloseSub={handleCloseSub}
              onRenew={handleRenew}
              onRefresh={loadData}
            />
          );
        case 'plans':
          return <PlanManagement plans={plans} />;
        case 'products':
          return <ProductsAddons products={products} />;
        case 'quotations':
          return (
            <QuotationsView
              quotations={quotations}
              onConfirmQuotation={handleConfirmQuotation}
              onRefresh={loadData}
            />
          );
        case 'customers':
          return <CustomersView customers={customers} />;
        case 'staff':
          return <StaffManagement staffList={staffList} />;
        case 'billing':
        case 'billing-dashboard':
          return <BillingDashboard onNavigate={setActiveView} />;
        case 'invoices':
          return <AllInvoicesView />;
        case 'upcoming-billing':
          return <UpcomingBillingView />;
        default:
          return (
            <AdminDashboard
              stats={stats}
              subscriptions={subscriptions}
              quotations={quotations}
              onSelectSubscription={handleSelectSubscription}
              onNavigate={setActiveView}
            />
          );
      }
    } else if (activeRole === 'staff') {
      switch (activeView) {
        case 'dashboard':
          return (
            <StaffDashboard
              stats={stats}
              subscriptions={subscriptions}
              quotations={quotations}
              onSelectSubscription={handleSelectSubscription}
              onNavigate={setActiveView}
            />
          );
        case 'subscriptions':
        case 'operations':
          return (
            <SubscriptionManagement
              subscriptions={subscriptions}
              onSelectSubscription={handleSelectSubscription}
              onPause={handlePause}
              onResume={handleResume}
              onCloseSub={handleCloseSub}
              onRenew={handleRenew}
              onRefresh={loadData}
            />
          );
        case 'customers':
          return <CustomersView customers={customers} />;
        case 'invoices':
          return <StaffInvoicesView />;
        case 'quotations':
          return (
            <QuotationsView
              quotations={quotations}
              onConfirmQuotation={handleConfirmQuotation}
              onRefresh={loadData}
            />
          );
        default:
          return (
            <StaffDashboard
              stats={stats}
              subscriptions={subscriptions}
              quotations={quotations}
              onSelectSubscription={handleSelectSubscription}
              onNavigate={setActiveView}
            />
          );
      }
    } else {
      // Customer
      switch (activeView) {
        case 'dashboard':
          return (
            <CustomerDashboard
              user={currentUser}
              subscriptions={subscriptions}
              quotations={quotations}
              onSelectSubscription={handleSelectSubscription}
              onNavigate={setActiveView}
            />
          );
        case 'subscriptions':
        case 'renewals':
          return (
            <SubscriptionManagement
              subscriptions={subscriptions}
              onSelectSubscription={handleSelectSubscription}
              onPause={handlePause}
              onResume={handleResume}
              onCloseSub={handleCloseSub}
              onRenew={handleRenew}
              onRefresh={loadData}
            />
          );
        case 'plans':
          return <PlanManagement plans={plans} />;
        case 'addons':
          return (
            <CustomerAddonsView
              subscription={subscriptions[0] || null}
              availableAddons={products}
              onRequestAddon={handleRequestAddon}
              onDisableAddon={handleDisableAddon}
              onRefresh={loadData}
            />
          );
        case 'quotations':
          return (
            <QuotationsView
              quotations={quotations}
              onConfirmQuotation={handleConfirmQuotation}
              onRefresh={loadData}
            />
          );
        case 'profile':
          return <CustomerProfile user={currentUser} />;
        case 'invoices':
          return <CustomerInvoicesView />;
        default:
          return (
            <CustomerDashboard
              user={currentUser}
              subscriptions={subscriptions}
              quotations={quotations}
              onSelectSubscription={handleSelectSubscription}
              onNavigate={setActiveView}
            />
          );
      }
    }
  };

  const getPageTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return activeRole === 'admin' ? 'Admin Dashboard' : activeRole === 'staff' ? 'Staff Console' : 'Customer Portal';
      case 'subscriptions':
        return 'Subscription Management';
      case 'plans':
        return 'Plans Catalog';
      case 'products':
        return 'Products & Add-ons';
      case 'quotations':
        return 'Subscription Quotations';
      case 'customers':
        return 'Customer Accounts';
      case 'staff':
        return 'Staff & Permissions';
      case 'billing-dashboard':
        return 'Recurring Billing & Invoicing Engine';
      case 'upcoming-billing':
        return 'Upcoming Billing Schedule';
      case 'invoices':
        return 'Invoices & Billing';
      case 'addons':
        return 'Add-ons Service';
      case 'profile':
        return 'Customer Profile';
      case 'operations':
        return 'Operational Audits';
      default:
        return 'SUBSCRIBO SaaS';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        currentRole={activeRole}
        activeView={activeView}
        onNavigate={setActiveView}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar
          title={getPageTitle()}
          role={activeRole}
          user={currentUser}
          onRefresh={loadData}
          isLoading={isLoading}
          onSwitchRole={handleSwitchRole}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </main>
      </div>

      {/* Subscription Detail Modal */}
      {selectedSubscription && (
        <SubscriptionDetailModal
          isOpen={true}
          onClose={() => setSelectedSubscription(null)}
          subscription={selectedSubscription}
          role={activeRole}
          onPause={(id) => handlePause(id, 'Admin/Staff modal pause')}
          onResume={(id) => handleResume(id, 'Admin/Staff modal resume')}
          onCloseSub={(id) => handleCloseSub(id, 'Admin/Staff modal close')}
          onRenew={(id) => handleRenew(id)}
          onDisableAddon={(addonId) => handleDisableAddon(addonId, 'Customer modal disable')}
        />
      )}
    </div>
  );
};

export default App;
