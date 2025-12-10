'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { authApi, LoginRequest } from '../../lib/auth-api';
import { useAuthStore } from '../../lib/auth-store';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function LoginPage() {
  console.log('LoginPage component mounted');

  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,

    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginRequest) => {
    console.log('=== FORM SUBMITTED ===');
    console.log('Form data:', { email: data.email, password: '***' });

    setIsLoading(true);
    setError(null);

    try {
      console.log('Calling authApi.login...');
      const response = await authApi.login(data);
      console.log('Login successful:', response);
      login(response.user);
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    console.log('🚨 handleFormSubmit called - preventing default');
    e.preventDefault();
    e.stopPropagation();

    // Get form data manually as a fallback
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    console.log('📝 Manual form data:', { email, password: password ? '***' : 'empty' });

    if (email && password) {
      onSubmit({ email, password });
    } else {
      console.log('❌ Missing email or password');
      setError('Please fill in both email and password');
    }
  };

  const testButtonClick = async () => {
    console.log('Test button clicked!');
    setError('Testing backend connection...');

    try {
      // Test if backend is accessible
      const response = await fetch('http://localhost:4500/health');
      const data = await response.json();
      console.log('Health check response:', data);
      setError(`Backend is accessible! Status: ${data.status}`);
    } catch (error) {
      console.error('Backend connection error:', error);
      setError('Backend is not accessible. Make sure the backend server is running on port 4500.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleFormSubmit} noValidate>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                {...register('email')}
                name="email"
                type="email"
                autoComplete="email"
                className="relative mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="Enter your email"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                {...register('password')}
                name="password"
                type="password"
                autoComplete="current-password"
                className="relative mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="Enter your password"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <button
              type="submit"
              disabled={isLoading}
              onClick={(e) => {
                console.log('🔘 Submit button clicked');
                e.preventDefault();
                const form = e.currentTarget.closest('form');
                if (form) {
                  const formData = new FormData(form);
                  const email = formData.get('email') as string;
                  const password = formData.get('password') as string;
                  console.log('🔘 Button click form data:', {
                    email,
                    password: password ? '***' : 'empty',
                  });
                  if (email && password) {
                    onSubmit({ email, password });
                  } else {
                    setError('Please fill in both email and password');
                  }
                }
              }}
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={testButtonClick}
              className="group relative flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Test Backend Connection
            </button>
            <button
              type="button"
              onClick={() => {
                console.log('Direct login test clicked!');
                const email = (document.querySelector('input[type="email"]') as HTMLInputElement)
                  ?.value;
                const password = (
                  document.querySelector('input[type="password"]') as HTMLInputElement
                )?.value;
                console.log('Form values:', { email, password: '***' });
                if (email && password) {
                  onSubmit({ email, password });
                } else {
                  setError('Please fill in both email and password');
                }
              }}
              className="group relative flex w-full justify-center rounded-md border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
            >
              Direct Login Test
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
