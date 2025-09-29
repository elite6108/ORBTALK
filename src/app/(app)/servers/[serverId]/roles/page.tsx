import { getCurrentUserAction } from '@/lib/auth/server-actions';
import { redirect } from 'next/navigation';
import { listServerRoles, getMyServerMembership } from '@/lib/servers/actions';
import { RolesManager } from './roles-manager';

interface RolesPageProps {
  params: Promise<{ serverId: string }>;
}

export default async function RolesPage({ params }: RolesPageProps) {
  const userData = await getCurrentUserAction();
  if (!userData) redirect('/sign-in');
  const { serverId } = await params;
  // Authorization: only owner/admin or users with manage_roles permission
  const membership = await getMyServerMembership(serverId);
  if (membership.error) {
    redirect('/servers');
  }
  const rolesRes = await listServerRoles(serverId);

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Server Roles</h1>
      {/* @ts-expect-error Server Component passing to Client */}
      <RolesManager serverId={serverId} initialRoles={rolesRes.roles ?? []} />
    </div>
  );
}


