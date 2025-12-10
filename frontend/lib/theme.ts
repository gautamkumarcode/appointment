// AI Appointment Scheduler - Color Theme Configuration

export const theme = {
  // Primary Brand Colors
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Main brand color
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },

  // Secondary Colors (Purple for AI/Tech feel)
  secondary: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7c3aed',
    800: '#6b21a8',
    900: '#581c87',
  },

  // Success (Green for appointments, bookings)
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },

  // Warning (Orange for pending, reminders)
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },

  // Error (Red for cancellations, no-shows)
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },

  // Neutral Grays
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
};

// Gradient combinations
export const gradients = {
  primary: 'bg-gradient-to-r from-sky-500 to-blue-600',
  secondary: 'bg-gradient-to-r from-purple-500 to-indigo-600',
  success: 'bg-gradient-to-r from-emerald-500 to-green-600',
  warning: 'bg-gradient-to-r from-amber-500 to-orange-600',
  error: 'bg-gradient-to-r from-red-500 to-rose-600',
  neutral: 'bg-gradient-to-r from-gray-500 to-slate-600',
};

// Shadow configurations
export const shadows = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  colored: {
    primary: 'shadow-lg shadow-sky-500/25',
    secondary: 'shadow-lg shadow-purple-500/25',
    success: 'shadow-lg shadow-emerald-500/25',
    warning: 'shadow-lg shadow-amber-500/25',
    error: 'shadow-lg shadow-red-500/25',
  },
};
