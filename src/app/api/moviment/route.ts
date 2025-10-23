import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import MovementModel from '../../../models/Moviment';
import Product from '../../../models/Product';

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/avaliacao_pratica';

async function connectToDatabase() {
  if (!MONGO_URI) throw new Error('MONGO_URI não configurado.');
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI);
}

const isValidId = (id?: string) => !!id && mongoose.isValidObjectId(id);

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const productId = url.searchParams.get('productId') || undefined;
    const userId = url.searchParams.get('userId') || undefined;
    const type = url.searchParams.get('type') || undefined;
    const from = url.searchParams.get('from') || undefined;
    const to = url.searchParams.get('to') || undefined;
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const limit = Math.max(1, Number(url.searchParams.get('limit') || 50));
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (productId) {
      if (!isValidId(productId)) return NextResponse.json({ success: false, message: 'productId inválido.' }, { status: 400 });
      filter.productId = productId;
    }
    if (userId) {
      if (!isValidId(userId)) return NextResponse.json({ success: false, message: 'userId inválido.' }, { status: 400 });
      filter.userId = userId;
    }
    if (type) {
      if (!['entry', 'exit'].includes(type)) return NextResponse.json({ success: false, message: 'type inválido.' }, { status: 400 });
      filter.type = type;
    }
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(String(from));
      if (to) filter.date.$lte = new Date(String(to));
    }

    const [items, total] = await Promise.all([
      MovementModel.find(filter).sort({ date: -1 }).skip(skip).limit(limit).populate('productId', 'name').populate('userId', 'nome'),
      MovementModel.countDocuments(filter)
    ]);

    return NextResponse.json({ success: true, data: items, meta: { total, page, limit } }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Erro ao listar movimentações.', error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await mongoose.startSession();
  try {
    await connectToDatabase();

    const body = await req.json();
    const { productId, userId, quantity, type, date } = body as any;

    if (!isValidId(productId)) return NextResponse.json({ success: false, message: 'productId inválido.' }, { status: 400 });
    if (!isValidId(userId)) return NextResponse.json({ success: false, message: 'userId inválido.' }, { status: 400 });
    if (typeof quantity !== 'number' || quantity <= 0) return NextResponse.json({ success: false, message: 'quantity deve ser número positivo.' }, { status: 400 });
    if (!['entry', 'exit'].includes(type)) return NextResponse.json({ success: false, message: 'type deve ser "entry" ou "exit".' }, { status: 400 });

    session.startTransaction();
    const product = await Product.findById(productId).session(session);
    if (!product) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ success: false, message: 'Produto não encontrado.' }, { status: 404 });
    }

    if (type === 'exit' && product.quantity < quantity) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ success: false, message: 'Quantidade insuficiente em estoque.' }, { status: 400 });
    }

    const delta = type === 'entry' ? quantity : -quantity;
    product.quantity += delta;
    product.updatedAt = new Date();
    await product.save({ session });

    const movement = await MovementModel.create(
      [
        {
          productId: product._id,
          quantity,
          type,
          date: date ? new Date(date) : new Date(),
          userId
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    const belowMin = product.quantity < (product as any).minimumStock;
    const alert = belowMin ? { message: 'Estoque abaixo do mínimo configurado.', current: product.quantity, minimum: (product as any).minimumStock } : null;

    return NextResponse.json({ success: true, data: movement[0], product, alert }, { status: 201 });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return NextResponse.json({ success: false, message: 'Erro ao criar movimentação.', error: (err as Error).message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';