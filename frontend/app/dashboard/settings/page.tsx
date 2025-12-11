'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { copyToClipboardWithToast } from '@/lib/clipboard';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy, ExternalLink, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { tenantApi } from '../../../lib/tenant-api';
import { Tenant } from '../../../types';
const settingsSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  timezone: z.string().min(1, 'Please select a timezone'),
  currency: z.string().min(3, 'Please select a currency'),
  primaryColor: z.string().optional(),
});

const notificationSchema = z.object({
  emailBookings: z.boolean(),
  emailCancellations: z.boolean(),
  smsNotifications: z.boolean(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;
type NotificationFormData = z.infer<typeof notificationSchema>;

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Australia/Sydney',
];

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'JPY', name: 'Japanese Yen' },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
  });

  const {
    register: registerNotification,
    handleSubmit: handleNotificationSubmit,
    reset: resetNotifications,
  } = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
  });

  useEffect(() => {
    loadTenant();
  }, []);

  const loadTenant = async () => {
    try {
      setLoading(true);
      const data = await tenantApi.getTenant();
      setTenant(data);
      reset({
        businessName: data.businessName,
        email: data.email,
        phone: data.phone || '',
        timezone: data.timezone,
        currency: data.currency,
        primaryColor: data.primaryColor || '#3B82F6',
      });

      // Reset notification preferences
      const notifications = data.settings?.notifications || {};
      resetNotifications({
        emailBookings: notifications.emailBookings !== false,
        emailCancellations: notifications.emailCancellations !== false,
        smsNotifications: notifications.smsNotifications === true,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: SettingsFormData) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updatedTenant = await tenantApi.updateTenant(data);
      setTenant(updatedTenant);
      setSuccess('Settings updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const onNotificationSubmit = async (data: NotificationFormData) => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const currentSettings = tenant?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        notifications: {
          emailBookings: data.emailBookings,
          emailCancellations: data.emailCancellations,
          smsNotifications: data.smsNotifications,
        },
      };

      const updatedTenant = await tenantApi.updateTenant({ settings: updatedSettings });
      setTenant(updatedTenant);
      setSuccess('Notification preferences updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update notification preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB
      setError('Image file must be less than 5MB');
      return;
    }

    setLogoUploading(true);
    setError(null);

    try {
      const result = await tenantApi.uploadLogo(file);
      const updatedTenant = await tenantApi.updateTenant({ logo: result.url });
      setTenant(updatedTenant);
      setSuccess('Logo updated successfully');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const getBookingUrl = () => {
    if (!tenant) return '';
    const baseUrl =
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
    return `${baseUrl}/book/${tenant.slug}`;
  };

  const copyBookingUrl = async () => {
    const url = getBookingUrl();

    await copyToClipboardWithToast(
      url,
      toast,
      'Booking URL has been copied to your clipboard.',
      'Unable to copy URL automatically. Please copy it manually from the input field.'
    );

    // Show visual feedback
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-red-600">Failed to load tenant settings</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-700">
            Manage your business settings and preferences.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-md bg-green-50 p-4">
          <div className="text-sm text-green-700">{success}</div>
        </div>
      )}

      <div className="mt-8 space-y-8">
        {/* Booking URL */}
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">Booking URL</h3>
            <p className="mb-4 text-sm text-gray-600">
              Share this URL with your customers so they can book appointments online.
            </p>
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <Input type="text" value={getBookingUrl()} readOnly className="bg-muted" />
              </div>
              <Button onClick={copyBookingUrl} variant="outline">
                {copiedUrl ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
              <a
                href={getBookingUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Visit
              </a>
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">
              Business Information
            </h3>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="businessName" className="text-sm font-medium text-gray-700">
                    Business Name *
                  </Label>
                  <Input {...register('businessName')} type="text" className="mt-1" />
                  {errors.businessName && (
                    <p className="mt-1 text-sm text-red-600">{errors.businessName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email Address *
                  </Label>
                  <Input {...register('email')} type="email" className="mt-1" />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                    Phone Number
                  </Label>
                  <Input {...register('phone')} type="tel" className="mt-1" />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="timezone" className="text-sm font-medium text-gray-700">
                    Timezone *
                  </Label>
                  <Controller
                    name="timezone"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select a timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.timezone && (
                    <p className="mt-1 text-sm text-red-600">{errors.timezone.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="currency" className="text-sm font-medium text-gray-700">
                    Currency *
                  </Label>
                  <Controller
                    name="currency"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select a currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((currency) => (
                            <SelectItem key={currency.code} value={currency.code}>
                              {currency.code} - {currency.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.currency && (
                    <p className="mt-1 text-sm text-red-600">{errors.currency.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="primaryColor" className="text-sm font-medium text-gray-700">
                    Brand Color
                  </Label>
                  <div className="mt-1 flex items-center space-x-3">
                    <Input {...register('primaryColor')} type="color" className="h-10 w-20" />
                    <span className="text-sm text-gray-500">
                      Used for buttons and accents in your booking page
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving} variant="gradient">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Logo Upload */}
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">Business Logo</h3>
            <p className="mb-4 text-sm text-gray-600">
              Upload your business logo to display on your booking page.
            </p>

            <div className="flex items-center space-x-6">
              {tenant.logo && (
                <div className="flex-shrink-0">
                  <img
                    src={tenant.logo}
                    alt="Business Logo"
                    className="h-20 w-20 rounded-lg border border-gray-200 object-contain"
                  />
                </div>
              )}

              <div>
                <label className="block">
                  <span className="sr-only">Choose logo file</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    disabled={logoUploading}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                  />
                </label>
                <p className="mt-1 text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                {logoUploading && (
                  <div className="mt-2 flex items-center">
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-blue-600"></div>
                    <span className="text-sm text-gray-600">Uploading...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="mb-4 text-lg font-medium leading-6 text-gray-900">
              Notification Preferences
            </h3>
            <p className="mb-4 text-sm text-gray-600">
              Configure how you want to receive notifications about your business.
            </p>

            <form onSubmit={handleNotificationSubmit(onNotificationSubmit)} className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox {...registerNotification('emailBookings')} />
                  <Label className="text-sm text-gray-900">
                    Email notifications for new bookings
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox {...registerNotification('emailCancellations')} />
                  <Label className="text-sm text-gray-900">
                    Email notifications for cancellations
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox {...registerNotification('smsNotifications')} />
                  <Label className="text-sm text-gray-900">
                    SMS notifications (requires phone number)
                  </Label>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving} variant="gradient">
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Notification Preferences'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
