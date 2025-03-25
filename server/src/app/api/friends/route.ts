import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { supabase } from '@/lib/supabase';

const prisma = new PrismaClient();
const SPLITWISE_API_URL = 'https://secure.splitwise.com/api/v3.0/get_friends';
const SPLITWISE_ACCESS_TOKEN = process.env.SPLITWISE_ACCESS_TOKEN; // Store in .env file

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    return await prisma.$transaction(async (tx) => {
      const dbUser = await tx.user.findUnique({
        where: { email: user.email },
      });

      if (!dbUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders });
      }

      const friends = await tx.friend.findMany({
        where: { userId: dbUser.id },
        include: { friend: { select: { id: true, name: true, email: true, avatar_url: true } } },
      });

      let splitwiseFriends = [];
      try {
        const response = await fetch(SPLITWISE_API_URL, {
          headers: { Authorization: `Bearer ${SPLITWISE_ACCESS_TOKEN}` },
        });
        if (!response.ok) throw new Error('Failed to fetch Splitwise friends');
        const data = await response.json();
        splitwiseFriends = data.friends.map((f: { id: number; first_name: string; last_name?: string; email: string; picture?: { medium?: string } }) => ({
          id: f.id,
          name: f.first_name + ' ' + (f.last_name || ''),
          email: f.email,
          avatar_url: f.picture?.medium || null,
        }));
      } catch (err) {
        console.error('Error fetching Splitwise friends:', err);
      }

      return NextResponse.json(
        { friends: [...friends.map(f => f.friend), ...splitwiseFriends] },
        { headers: corsHeaders }
      );
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
