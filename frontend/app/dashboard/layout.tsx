'use client';

import Breadcrumb from '@/components/Breadcrumb';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Navbar from '../../components/Navbar';
import ProtectedRoute from '../../components/ProtectedRoute';
import Sidebar from '../../components/Sidebar';
import { authApi } from '../../lib/auth-api';
import { useAuthStore } from '../../lib/auth-store';
import { cn } from '../../lib/utils';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await authApi.logout();
      logout();
      router.push('/login');
    } catch (error) {
      // Even if logout fails, clear local state and redirect
      logout();
      router.push('/login');
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main content area */}
        <div
          className={cn(
            'transition-all duration-300 ease-in-out',
            'lg:ml-64', // Default margin for expanded sidebar
            sidebarCollapsed && 'lg:ml-16' // Reduced margin for collapsed sidebar
          )}
        >
          {/* Navbar */}
          <Navbar onMenuClick={() => setSidebarOpen(true)} onLogout={handleLogout} />

          {/* Page content */}
          <main className="flex-1">
            <div className="py-6">
              <div className="mx-auto p-4">
                <Breadcrumb />
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
