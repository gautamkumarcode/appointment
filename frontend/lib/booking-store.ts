import { create } from 'zustand';
import { Service, Staff } from '../types';
import { detectTimezone } from './utils';

export interface BookingState {
  // Current booking data
  tenantSlug: string | null;
  selectedService: Service | null;
  selectedStaff: Staff | null;
  selectedSlot: { startTime: string; endTime: string } | null;
  customerTimezone: string;

  // Customer information
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    notes: string;
    paymentOption: 'prepaid' | 'pay_at_venue';
  };

  // Actions
  setTenantSlug: (slug: string) => void;
  setSelectedService: (service: Service | null) => void;
  setSelectedStaff: (staff: Staff | null) => void;
  setSelectedSlot: (slot: { startTime: string; endTime: string } | null) => void;
  setCustomerInfo: (info: Partial<BookingState['customerInfo']>) => void;
  resetBooking: () => void;
}

const initialCustomerInfo = {
  name: '',
  email: '',
  phone: '',
  notes: '',
  paymentOption: 'pay_at_venue' as const,
};

export const useBookingStore = create<BookingState>((set) => ({
  tenantSlug: null,
  selectedService: null,
  selectedStaff: null,
  selectedSlot: null,
  customerTimezone: detectTimezone(),
  customerInfo: initialCustomerInfo,

  setTenantSlug: (slug) => set({ tenantSlug: slug }),

  setSelectedService: (service) =>
    set({
      selectedService: service,
      selectedStaff: null, // Reset staff when service changes
      selectedSlot: null, // Reset slot when service changes
    }),

  setSelectedStaff: (staff) =>
    set({
      selectedStaff: staff,
      selectedSlot: null, // Reset slot when staff changes
    }),

  setSelectedSlot: (slot) => set({ selectedSlot: slot }),

  setCustomerInfo: (info) =>
    set((state) => ({
      customerInfo: { ...state.customerInfo, ...info },
    })),

  resetBooking: () =>
    set({
      selectedService: null,
      selectedStaff: null,
      selectedSlot: null,
      customerInfo: initialCustomerInfo,
    }),
}));
