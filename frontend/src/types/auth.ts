export type UserRole = 'admin' | 'staff' | 'customer';

export interface User {
  id: number;
  name: string;
  email: string;
  login: string;
  role: UserRole;
  partnerId?: number;
  companyName?: string;
}

