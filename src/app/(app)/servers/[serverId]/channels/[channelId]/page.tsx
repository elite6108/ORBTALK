import { getCurrentUserAction } from '@/lib/auth/server-actions';
import { redirect } from 'next/navigation';
import { ChannelContent } from './channel-content';
import { getChannelMessages } from '@/lib/chat/actions';

interface ChannelPageProps {
  params: Promise<{
    serverId: string;
    channelId: string;
  }>;
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  const userData = await getCurrentUserAction();
  const resolvedParams = await params;

  if (!userData) {
    redirect('/sign-in');
  }

  // Preload initial messages and channel meta on the server to avoid client loading flash
  const initial = await getChannelMessages(resolvedParams.channelId, 50, 0);

  const { user, profile } = userData;

  return (
    <ChannelContent 
      serverId={resolvedParams.serverId} 
      channelId={resolvedParams.channelId} 
      user={{ ...user, profile }}
      initialData={initial}
    />
  );
}
