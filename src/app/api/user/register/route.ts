import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/controllers/UserController';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Create mock response object for legacy API route handler
    const mockRes = {
      status: (code: number) => ({
        json: (data: any) => ({ status: code, ...data })
      })
    };
    
    const result = await register({ body } as any, mockRes as any);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Erro no registro:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Erro interno do servidor' 
    }, { status: 500 });
  }
}