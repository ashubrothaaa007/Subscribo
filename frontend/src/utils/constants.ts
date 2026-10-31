/**
 * Application Constants
 */

export const APP_NAME = 'SUBSCRIBO';
export const APP_DESCRIPTION = 'Subscription Management System & Billing Engine';

export const DEFAULT_PAGE_SIZE = 20;

export const DEMO_USERS = [
  {
    role: 'admin' as const,
    login: 'admin',
    name: 'System Administrator',
    label: 'Admin (System)',
    color: 'purple',
  },
  {
    role: 'staff' as const,
    login: 'staff@example.com',
    name: 'Sarah Staff',
    label: 'Staff (Operations)',
    color: 'blue',
  },
  {
    role: 'customer' as const,
    login: 'portal.customer@example.com',
    name: 'Alex Customer',
    label: 'Customer (Portal)',
    color: 'emerald',
  },
];

