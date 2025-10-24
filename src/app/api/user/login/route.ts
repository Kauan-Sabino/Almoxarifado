import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/controllers/UserController';
import { connectToDatabase } from '@/services/mongodb';

export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();
    
    const body = await request.json();

    // Create mock response object for legacy API handler
    let statusCode = 200;
    let responseData = {};
    
    const mockRes = {
      status: (code: number) => {
        statusCode = code;
        return {
          json: (data: any) => {
            responseData = data;
            return data;
          }
        };
      }
    };

    // Call the login function
    await login({ body } as any, mockRes as any);

    // Return the response with the appropriate status code
    return NextResponse.json(responseData, { status: statusCode });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Erro interno do servidor' 
    }, { status: 500 });
  }
}