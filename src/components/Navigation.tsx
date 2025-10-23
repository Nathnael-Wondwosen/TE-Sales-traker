'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import ThemeToggle from '@/components/ThemeToggle';

export default function Navigation() {
  const { data: session } = useSession();
  const pathname = usePathname();
  
  if (!session) return null;

  const userRole = (session.user as any).role;

  const navItems = [
    { href: '/', label: 'Home', roles: ['admin', 'supervisor', 'agent'] },
    { href: '/agent', label: 'Agent Dashboard', roles: ['agent', 'supervisor', 'admin'] },
    { href: '/supervisor', label: 'Supervisor Dashboard', roles: ['supervisor', 'admin'] },
    { href: '/admin', label: 'Admin Dashboard', roles: ['admin'] },
  ].filter(item => item.roles.includes(userRole));

  return (
    <nav className="header bg-white shadow-md">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 font-bold text-xl tracking-tight flex items-center gap-2 text-blue-900">
              <div className="relative">
                <Image src="/logo.jpg" alt="TE-Sales Tracker" width={56} height={56} className="rounded-lg shadow-lg border-2 border-blue-200" />
              </div>
              <span className="drop-shadow-sm">TE-Sales Tracker</span>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                      pathname === item.href
                        ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-white shadow-lg'
                        : 'text-blue-900 hover:bg-blue-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6 space-x-4">
              <ThemeToggle />
              <div className="text-sm text-blue-900 flex items-center space-x-2">
                <div className="flex flex-col items-end">
                  <span className="font-medium drop-shadow-sm">{session.user?.name}</span>
                  <span className="text-xs text-amber-600 font-medium capitalize">{userRole}</span>
                </div>
                <span className="badge bg-gradient-to-r from-amber-400 to-yellow-500 text-white">
                  {userRole}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="btn text-sm flex items-center space-x-1 border border-blue-200 text-blue-900 hover:bg-blue-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}