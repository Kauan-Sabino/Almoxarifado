import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Product from '../../../models/Product';

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/avaliacao_pratica';

async function connectToDatabase() {
  if (!MONGO_URI) throw new Error('MONGO_URI não configurado.');
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI);
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const q = String(url.searchParams.get('q') || '').trim();
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const limit = Math.max(1, Number(url.searchParams.get('limit') || 50));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (q) {
      const regex = new RegExp(q, 'i');
      filter.$or = [{ name: regex }, { description: regex }];
    }

    const [items, total] = await Promise.all([
      Product.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
      Product.countDocuments(filter)
    ]);

    return NextResponse.json({ success: true, data: items, meta: { total, page, limit } }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Erro ao listar produtos.', error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { name, description = '', quantity = 0, minimumStock = 0 } = body as any;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ success: false, message: 'Campo "name" é obrigatório.' }, { status: 400 });
    }
    if (typeof quantity !== 'number' || quantity < 0) {
      return NextResponse.json({ success: false, message: 'Campo "quantity" deve ser número >= 0.' }, { status: 400 });
    }
    if (typeof minimumStock !== 'number' || minimumStock < 0) {
      return NextResponse.json({ success: false, message: 'Campo "minimumStock" deve ser número >= 0.' }, { status: 400 });
    }

    const product = new Product({ name, description, quantity, minimumStock });
    await product.save();

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Erro ao criar produto.', error: (err as Error).message }, { status: 500 });
  }
}