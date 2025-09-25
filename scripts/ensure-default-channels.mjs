import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://yoowbxaglfmconicaqsu.supabase.co';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'your-service-role-key-here';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const defaultChannels = [
  { name: 'general', type: 'text', description: 'General discussion' },
  { name: 'announcements', type: 'text', description: 'Server announcements' },
  { name: 'voice-chat', type: 'voice', description: 'General voice chat' },
];

async function ensureChannels() {
  const { data: servers, error: serversError } = await supabase
    .from('servers')
    .select('id, name')
    .order('created_at', { ascending: true });

  if (serversError) {
    console.error('Failed to fetch servers:', serversError);
    process.exit(1);
  }

  if (!servers || servers.length === 0) {
    console.log('No servers found. Nothing to seed.');
    return;
  }

  let serversUpdated = 0;
  let channelsCreated = 0;

  for (const server of servers) {
    const { data: existingChannels, error: channelsError } = await supabase
      .from('channels')
      .select('id')
      .eq('server_id', server.id)
      .limit(1);

    if (channelsError) {
      console.error(`Failed to fetch channels for server ${server.id}:`, channelsError);
      continue;
    }

    if (existingChannels && existingChannels.length > 0) {
      continue;
    }

    console.log(`Seeding default channels for server ${server.name} (${server.id})`);

    const inserts = defaultChannels.map((channel, index) => ({
      server_id: server.id,
      name: channel.name,
      type: channel.type,
      description: channel.description,
      position: index,
      is_private: false,
    }));

    const { error: insertError } = await supabase
      .from('channels')
      .insert(inserts);

    if (insertError) {
      console.error(`Failed to create channels for server ${server.id}:`, insertError);
      continue;
    }

    serversUpdated += 1;
    channelsCreated += inserts.length;
  }

  console.log(`Seeding complete. Updated ${serversUpdated} server(s) and created ${channelsCreated} channel(s).`);
}

ensureChannels()
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Unexpected error while ensuring channels:', error);
    process.exit(1);
  });

