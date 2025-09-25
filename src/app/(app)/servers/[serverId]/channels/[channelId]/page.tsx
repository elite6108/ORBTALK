import { getCurrentUserAction } from '@/lib/auth/server-actions';
import { redirect } from 'next/navigation';
import { ChannelContent } from './channel-content';

interface ChannelPageProps {
  params: {
    serverId: string;
    channelId: string;
  };
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const userData = await getCurrentUserAction();
  const resolvedParams = await params;
  
  if (!userData) {
    redirect('/sign-in');
  }

  const { user, profile } = userData;

  return <ChannelContent serverId={resolvedParams.serverId} channelId={resolvedParams.channelId} user={{ ...user, profile }} />;
}
