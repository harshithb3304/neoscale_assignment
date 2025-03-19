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

    const dbUser = await prisma.user.findFirst({
      where: { email: user.email },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404, headers: corsHeaders });
    }

    const { searchParams } = new URL(request.url);
    const issplit = searchParams.get('issplit');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const minAmount = searchParams.get('minAmount');
    const maxAmount = searchParams.get('maxAmount');

    // const transactions = await prisma.transaction.findMany({
    //   where: {
    //     userId: dbUser.id,
    //     ...(issplit !== null && { issplit: issplit === 'true' }),
    //     ...(startDate && { date: { gte: new Date(startDate) } }),
    //     ...(endDate && { date: { lte: new Date(endDate) } }),
    //     ...(minAmount !== null && { amount: { gte: parseFloat(minAmount) } }),
    //     ...(maxAmount !== null && { amount: { lte: parseFloat(maxAmount) } }),
    //   },
    //   include: {
    //     splits: {
    //         include: {
    //         user: true
    //       }
    //     }
    //   },
    //   orderBy: {
    //     date: 'desc',
    //   },
    // });


    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          // Transactions created by the user
          {
            userId: dbUser.id,
            ...(issplit !== null && { issplit: issplit === 'true' }),
        ...(startDate && { date: { gte: new Date(startDate) } }),
        ...(endDate && { date: { lte: new Date(endDate) } }),
        ...(minAmount !== null && { amount: { gte: parseFloat(minAmount) } }),
        ...(maxAmount !== null && { amount: { lte: parseFloat(maxAmount) } }),
          },
          // Transactions where the user is part of a split
          {
            splits: {
              some: {
                userId: dbUser.id
              }
            },
            ...(issplit !== null && { issplit: issplit === 'true' }),
        ...(startDate && { date: { gte: new Date(startDate) } }),
        ...(endDate && { date: { lte: new Date(endDate) } }),
        ...(minAmount !== null && { amount: { gte: parseFloat(minAmount) } }),
        ...(maxAmount !== null && { amount: { lte: parseFloat(maxAmount) } }),
          }
        ]
      },
      include: {
        user: true, // Include the creator of the transaction
        splits: {
          include: {
            user: true // Include the user details for each split
          }
        }
      },
      orderBy: {
        date: 'desc',
      },
    });

    return NextResponse.json({ transactions }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

