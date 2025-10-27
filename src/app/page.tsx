import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getDashboardPath } from '@/lib/rbac';

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  const role = (session.user as any)?.role || 'agent';
  const dashboardPath = getDashboardPath(role as any);
  redirect(dashboardPath);
}