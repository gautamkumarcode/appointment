'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CreateStaffRequest, staffApi } from '../../../lib/staff-api';
import { Staff } from '../../../types';

const staffSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
});

type StaffFormData = z.infer<typeof staffSchema>;

interface StaffFormProps {
  staff?: Staff | null;
  onSuccess: (staff: Staff) => void;
  onCancel: () => void;
}

export default function StaffForm({ staff, onSuccess, onCancel }: StaffFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: staff?.name || '',
      email: staff?.email || '',
      phone: staff?.phone || '',
    },
  });

  const onSubmit = async (data: StaffFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Create default weekly schedule if creating new staff
      const weeklySchedule = staff?.weeklySchedule || {
        monday: [{ start: '09:00', end: '17:00' }],
        tuesday: [{ start: '09:00', end: '17:00' }],
        wednesday: [{ start: '09:00', end: '17:00' }],
        thursday: [{ start: '09:00', end: '17:00' }],
        friday: [{ start: '09:00', end: '17:00' }],
        saturday: [],
        sunday: [],
      };

      const staffData = {
        ...data,
        email: data.email || undefined,
        phone: data.phone || undefined,
        weeklySchedule,
      };

      let result: Staff;
      if (staff) {
        result = await staffApi.updateStaff(staff._id, staffData);
      } else {
        result = await staffApi.createStaff(staffData as CreateStaffRequest);
      }
      onSuccess(result);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save staff member');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 h-full w-full overflow-y-auto bg-gray-600 bg-opacity-50">
      <div className="relative top-20 mx-auto w-full max-w-md rounded-md border bg-white p-5 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            {staff ? 'Edit Staff Member' : 'Add New Staff Member'}
          </h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm font-medium text-gray-700">
              Full Name *
            </Label>
            <Input
              {...register('name')}
              type="text"
              className="mt-1"
              placeholder="Enter staff member's name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email Address
            </Label>
            <Input
              {...register('email')}
              type="email"
              className="mt-1"
              placeholder="Enter email address"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
              Phone Number
            </Label>
            <Input
              {...register('phone')}
              type="tel"
              className="mt-1"
              placeholder="Enter phone number"
            />
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
          </div>

          {!staff && (
            <div className="rounded-md bg-blue-50 p-4">
              <p className="text-sm text-blue-700">
                A default schedule (Monday-Friday, 9 AM - 5 PM) will be created. You can customize
                it after creating the staff member.
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" onClick={onCancel} variant="outline">
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} variant="gradient">
              {isLoading ? 'Saving...' : staff ? 'Update Staff Member' : 'Add Staff Member'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
