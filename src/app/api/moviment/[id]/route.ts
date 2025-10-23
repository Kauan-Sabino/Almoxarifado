import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import MovementModel from '../../../../models/Moviment';
import Product from '../../../../models/Product';

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/avaliacao_pratica';

async function connectToDatabase() {
  if (!MONGO_URI) throw new Error('MONGO_URI não configurado.');
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI);
}

const isValidId = (id?: string) => !!id && mongoose.isValidObjectId(id);

/**
 * GET /api/movement/:id  -> retorna uma movimentação (com product e user populados se aplicável)
 */
export async function GET(req: NextRequest, { params }: { params: { id?: string } }) {
  try {
    await connectToDatabase();

    const { id } = params;
    if (!isValidId(id)) return NextResponse.json({ success: false, message: 'ID inválido.' }, { status: 400 });

    const movement = await MovementModel.findById(id).populate('productId', 'name').populate('userId', 'nome email');
    if (!movement) return NextResponse.json({ success: false, message: 'Movimentação não encontrada.' }, { status: 404 });

    return NextResponse.json({ success: true, data: movement }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Erro ao obter movimentação.', error: (err as Error).message }, { status: 500 });
  }
}

/**
 * PATCH /api/movement/:id
 * Body (parcial): { quantity?, type? ('entry'|'exit'), date?, userId? }
 * Atualiza a movimentação e ajusta o estoque do produto de forma atômica.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id?: string } }) {
  const session = await mongoose.startSession();
  try {
    await connectToDatabase();

    const { id } = params;
    if (!isValidId(id)) return NextResponse.json({ success: false, message: 'ID inválido.' }, { status: 400 });

    const body = await req.json();
    const newQuantity = body.quantity !== undefined ? Number(body.quantity) : undefined;
    const newType = body.type as ('entry' | 'exit') | undefined;
    const newDate = body.date ? new Date(body.date) : undefined;
    const newUserId = body.userId;

    if (newQuantity !== undefined && (!Number.isFinite(newQuantity) || newQuantity <= 0)) {
      return NextResponse.json({ success: false, message: 'quantity deve ser número positivo.' }, { status: 400 });
    }
    if (newType !== undefined && !['entry', 'exit'].includes(newType)) {
      return NextResponse.json({ success: false, message: 'type deve ser "entry" ou "exit".' }, { status: 400 });
    }
    if (newUserId !== undefined && !isValidId(String(newUserId))) {
      return NextResponse.json({ success: false, message: 'userId inválido.' }, { status: 400 });
    }

    session.startTransaction();
    const movement = await MovementModel.findById(id).session(session);
    if (!movement) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ success: false, message: 'Movimentação não encontrada.' }, { status: 404 });
    }

    const product = await Product.findById(movement.productId).session(session);
    if (!product) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ success: false, message: 'Produto relacionado não encontrado.' }, { status: 404 });
    }

    // Reverter efeito da movimentação antiga
    const oldDelta = movement.type === 'entry' ? -movement.quantity : movement.quantity;
    // Aplicar efeito da movimentação nova (se campos não informados mantêm os antigos)
    const applyQuantity = newQuantity !== undefined ? newQuantity : movement.quantity;
    const applyType = newType !== undefined ? newType : movement.type;
    const newDelta = applyType === 'entry' ? applyQuantity : -applyQuantity;

    const resultingQuantity = product.quantity + oldDelta + newDelta;
    if (resultingQuantity < 0) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ success: false, message: 'Atualização causaria estoque negativo. Operação cancelada.' }, { status: 400 });
    }

    // Atualiza produto e movimentação
    product.quantity = resultingQuantity;
    product.updatedAt = new Date();
    await product.save({ session });

    if (newQuantity !== undefined) movement.quantity = applyQuantity;
    if (newType !== undefined) movement.type = applyType;
    if (newDate !== undefined) movement.date = newDate;
    if (newUserId !== undefined) movement.userId = newUserId;

    await movement.save({ session });

    await session.commitTransaction();
    session.endSession();

    const belowMin = product.quantity < (product as any).minimumStock;
    const alert = belowMin ? { message: 'Estoque abaixo do mínimo configurado.', current: product.quantity, minimum: (product as any).minimumStock } : null;

    return NextResponse.json({ success: true, data: movement, product, alert }, { status: 200 });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return NextResponse.json({ success: false, message: 'Erro ao atualizar movimentação.', error: (err as Error).message }, { status: 500 });
  }
}

/**
 * DELETE /api/movement/:id
 * Exclui movimentação e reverte efeito no estoque (se possível)
 */
export async function DELETE(req: NextRequest, { params }: { params: { id?: string } }) {
  const session = await mongoose.startSession();
  try {
    await connectToDatabase();

    const { id } = params;
    if (!isValidId(id)) return NextResponse.json({ success: false, message: 'ID inválido.' }, { status: 400 });

    session.startTransaction();
    const movement = await MovementModel.findById(id).session(session);
    if (!movement) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ success: false, message: 'Movimentação não encontrada.' }, { status: 404 });
    }

    const product = await Product.findById(movement.productId).session(session);
    if (!product) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ success: false, message: 'Produto relacionado não encontrado.' }, { status: 404 });
    }

    const revertDelta = movement.type === 'entry' ? -movement.quantity : movement.quantity;
    if (product.quantity + revertDelta < 0) {
      await session.abortTransaction();
      session.endSession();
      return NextResponse.json({ success: false, message: 'Exclusão causaria estoque negativo. Operação cancelada.' }, { status: 400 });
    }

    product.quantity += revertDelta;
    product.updatedAt = new Date();
    await product.save({ session });

    await movement.deleteOne({ session });

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({ success: true, message: 'Movimentação excluída e estoque revertido.', product }, { status: 200 });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return NextResponse.json({ success: false, message: 'Erro ao excluir movimentação.', error: (err as Error).message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
