import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { supabase } from '@/lib/supabase';

const prisma = new PrismaClient();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(request: Request) {
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

    const dbUser = await prisma.user.findFirst({
      where: { email: user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders });
    }

    const body = await request.json();
    const { transactionId, friendIds } = body;

    // Fetch the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404, headers: corsHeaders });
    }

    // Calculate split amount
    const splitAmount = transaction.amount / (friendIds.length + 1); // Including the user

    // Create splits for each friend
    const splits = await Promise.all(
      friendIds.map(async (friendId: string) => {
        return prisma.split.create({
          data: {
            transactionId,
            userId: friendId,
            amount: splitAmount,
          },
        });
      })
    );

    // Update the transaction to mark it as split
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { issplit: true },
    });
    console.log('Transaction updated as split', transactionId, friendIds);

    return NextResponse.json({ splits }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error splitting transaction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}