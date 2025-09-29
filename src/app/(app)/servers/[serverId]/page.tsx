import { redirect } from 'next/navigation';
import { getFirstChannel } from '@/lib/servers/actions';

interface ServerRedirectPageProps {
  params: {
    serverId: string;
  };
}

export default async function ServerRedirectPage({ params }: ServerRedirectPageProps) {
  const serverId = params.serverId;

  if (!serverId) {
    redirect('/servers');
  }

  const { error, channelId } = await getFirstChannel(serverId);
  if (error || !channelId) {
    redirect('/servers');
  }

  redirect(`/servers/${serverId}/channels/${channelId}`);
}


