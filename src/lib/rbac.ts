import { Session } from 'next-auth';

export type Role = 'admin' | 'supervisor' | 'agent';

export const roles: Role[] = ['admin', 'supervisor', 'agent'];

export const roleHierarchy: Record<Role, number> = {
  admin: 3,
  supervisor: 2,
  agent: 1,
};

export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function canAccessRoute(session: Session | null, route: string): boolean {
  if (!session) return false;
  
  const userRole = (session.user as any).role as string;
  
  // Admins can access everything
  if (userRole === 'admin') return true;
  
  // Check route-specific permissions
  if (route.startsWith('/admin')) {
    return userRole === 'admin';
  }
  
  if (route.startsWith('/supervisor')) {
    return userRole === 'supervisor' || userRole === 'admin';
  }
  
  if (route.startsWith('/agent')) {
    return userRole === 'agent' || userRole === 'supervisor' || userRole === 'admin';
  }
  
  // Public routes
  return true;
}

export function getDashboardPath(role: Role): string {
  switch (role) {
    case 'admin': return '/admin';
    case 'supervisor': return '/supervisor';
    case 'agent': return '/agent';
    default: return '/';
  }
}