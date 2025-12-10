'use client';

import { ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';

interface BreadcrumbItem {
  name: string;
  href: string;
}

export default function Breadcrumb() {
  const pathname = usePathname();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [];

    // Always start with Dashboard
    breadcrumbs.push({ name: 'Dashboard', href: '/dashboard' });

    // Generate breadcrumbs for each path segment
    let currentPath = '';
    for (let i = 1; i < pathSegments.length; i++) {
      currentPath += `/${pathSegments[i]}`;
      const segment = pathSegments[i];
      
      // Convert segment to readable name
      const name = segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      breadcrumbs.push({
        name,
        href: `/dashboard${currentPath}`,
      });
    }

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't show breadcrumbs on the main dashboard page
  if (pathname === '/dashboard') {
    return null;
  }

  return (
    <nav className="flex mb-6" aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        <li>
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-gray-500 transition-colors duration-150"
          >
            <Home className="h-4 w-4" />
          </Link>
        </li>
        {breadcrumbs.slice(1).map((item, index) => (
          <Fragment key={item.href}>
            <li>
              <div className="flex items-center">
                <ChevronRight className="h-4 w-4 text-gray-400" />
                {index === breadcrumbs.length - 2 ? (
                  // Current page - not clickable
                  <span className="ml-2 text-sm font-medium text-gray-900">
                    {item.name}
                  </span>
                ) : (
                  // Intermediate pages - clickable
                  <Link
                    href={item.href}
                    className="ml-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors duration-150"
                  >
                    {item.name}
                  </Link>
                )}
              </div>
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}