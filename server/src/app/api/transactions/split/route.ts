import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { supabase } from '@/lib/supabase';

const prisma = new PrismaClient();
const SPLITWISE_API_URL = 'https://secure.splitwise.com/api/v3.0/create_expense';
const SPLITWISE_ACCESS_TOKEN = process.env.SPLITWISE_ACCESS_TOKEN;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    // Validate Authorization Header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    // Fetch user from the database
    const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
    if (!dbUser || !dbUser.id) {
      return NextResponse.json({ error: 'User not found or not linked to Splitwise' }, { status: 404, headers: corsHeaders });
    }

    // Extract request body
    const body = await request.json();
    console.log('Received Body:', body);
    
    const { 
      transactionId, 
      friendIds, 
      description, 
      amount, 
      currency, 
      category_id, 
      group_id 
    } = body;

    // Validate amount
    if (typeof amount !== 'number' || isNaN(amount)) {
      return NextResponse.json({ error: 'Invalid or missing amount' }, { status: 400, headers: corsHeaders });
    }

    // Fetch the transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404, headers: corsHeaders });
    }

    // Calculate split amount
    const splitAmount = (transaction.amount / (friendIds.length + 1));

    // **Create Expense on Splitwise**
    const splitwiseResponse = await fetch(SPLITWISE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SPLITWISE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cost: transaction.amount.toFixed(2),
        description: description || transaction.description,
        details: "Automated expense split",
        date: transaction.date.toISOString(),
        repeat_interval: "never",
        currency_code: currency || "USD",
        category_id: category_id || 15,
        group_id: group_id || 0,
        split_equally: true,
      }),
    });

    // Detailed logging
    console.log('Splitwise API Request Body:', JSON.stringify({
      cost: transaction.amount.toFixed(2),
      description: description || transaction.description,
      group_id: group_id || 0,
      category_id: category_id || 15,
      currency_code: currency || "USD",
      repeat_interval: "never",
    }, null, 2));

    // Check Splitwise API response
    if (!splitwiseResponse.ok) {
      const errorBody = await splitwiseResponse.text();
      console.error('Splitwise API Response Status:', splitwiseResponse.status);
      console.error('Splitwise API Error Body:', errorBody);
      return NextResponse.json({ 
        error: 'Failed to create expense on Splitwise', 
        status: splitwiseResponse.status,
        details: errorBody 
      }, { status: 500, headers: corsHeaders });
    }

    const splitwiseData = await splitwiseResponse.json();
    
    // Log the full Splitwise response
    console.log('Splitwise API Full Response:', JSON.stringify(splitwiseData, null, 2));

    const splits = await Promise.all(
      friendIds.map(async (friendId: string) => {
        const uuidUserId = `${friendId.toString().padStart(8, '0')}-0000-4000-a000-000000000000`;
        
        return prisma.split.create({
          data: {
            transactionId,
            userId: uuidUserId,
            amount: splitAmount,
          },
        });
      })
    );
    
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { issplit: true },
    });
    console.log('Transaction updated as split', transactionId, friendIds);

    console.log(splits);
    return NextResponse.json({ 
      message: 'Transaction split successfully', 
      splitwiseData 
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Detailed Error splitting transaction:', error);
    return NextResponse.json({ error: 'Internal server error', details: error}, { status: 500, headers: corsHeaders });
  }
}
