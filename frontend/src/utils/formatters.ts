/**
 * SUBSCRIBO Utility Formatters
 * Production-grade data and presentation formatters.
 */

export const formatCurrency = (amount: number = 0, currency: string = 'INR'): string => {
  const symbol = currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : `${currency} `;
  return `${symbol} ${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatDate = (dateString?: string, fallback: string = '-'): string => {
  if (!dateString) return fallback;
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatStatus = (status: string): string => {
  if (!status) return '';
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
};

export const sanitizeString = (str?: string): string => {
  if (!str) return '';
  return str.trim();
};

