'use client';

import { format, parseISO } from 'date-fns';
import { Briefcase, Clock, DollarSign, User } from 'lucide-react';
import { Appointment, AppointmentStatus } from '../../../types';

interface AppointmentCardProps {
  appointment: Appointment;
  onClick: () => void;
}

export default function AppointmentCard({ appointment, onClick }: AppointmentCardProps) {
  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no-show':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="mb-2 flex items-center space-x-3">
            <div className="flex items-center text-sm text-gray-600">
              <Clock className="mr-1 h-4 w-4" />
              {format(parseISO(appointment.startTime), 'MMM d, yyyy • h:mm a')}
            </div>
            <span
              className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getStatusColor(appointment.status)}`}
            >
              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center text-sm">
              <User className="mr-2 h-4 w-4 text-gray-400" />
              <span className="font-medium text-gray-900">{appointment.customer?.name}</span>
              <span className="ml-2 text-gray-500">{appointment.customer?.email}</span>
            </div>

            <div className="flex items-center text-sm text-gray-600">
              <Briefcase className="mr-2 h-4 w-4 text-gray-400" />
              <span>{appointment.service?.name}</span>
              {appointment.staff && <span className="ml-2">• with {appointment.staff.name}</span>}
            </div>

            {appointment.amount && (
              <div className="flex items-center text-sm text-gray-600">
                <DollarSign className="mr-2 h-4 w-4 text-gray-400" />
                <span>{formatCurrency(appointment.amount, 'USD')}</span>
                <span className="ml-2">
                  ({appointment.paymentOption === 'prepaid' ? 'Prepaid' : 'Pay at venue'})
                </span>
                <span
                  className={`ml-2 rounded-full px-2 py-1 text-xs ${
                    appointment.paymentStatus === 'paid'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {appointment.paymentStatus}
                </span>
              </div>
            )}

            {appointment.notes && (
              <div className="mt-2 text-sm text-gray-500">
                <span className="font-medium">Notes:</span> {appointment.notes}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
