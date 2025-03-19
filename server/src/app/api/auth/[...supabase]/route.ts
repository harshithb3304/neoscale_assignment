// app/api/auth/sync-user/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    // Verify using the Supabase anon key
    const secret = request.headers.get('Authorization');
    if (secret !== `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('User sync request:', body);

    const { id, email, metadata } = body;

    if (!id || !email) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Use upsert to create or update the user
    const user = await prisma.user.upsert({
      where: { 
        email: email,
      },
      update: {
        name: metadata?.full_name || metadata?.name || email.split('@')[0],
      },
      create: {
        id: id,
        email: email,
        name: metadata?.full_name || metadata?.name || email.split('@')[0],
        googleid: metadata?.provider === 'google' ? id : null,
      },
    });
    
    console.log(`User ${email} synchronized with database`);
    return NextResponse.json({ success: true, userId: user.id });
  } catch (error) {
    console.error('User sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}