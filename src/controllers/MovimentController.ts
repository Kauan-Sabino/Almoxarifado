import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import MovementModel from '../models/Moviment';
import Product from '../models/Product';

const isValidId = (id?: string) => !!id && mongoose.isValidObjectId(id);

/**
 * Cria uma movimentação (entrada/saída) e atualiza o estoque do produto de forma atômica.
 * body: { productId, userId, quantity, type: 'entry'|'exit', date? }
 */
export const createMovement = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await mongoose.startSession();
  try {
    const { productId, userId, quantity, type, date } = req.body;
    if (!isValidId(productId)) return res.status(400).json({ success: false, message: 'productId inválido.' });
    if (!isValidId(userId)) return res.status(400).json({ success: false, message: 'userId inválido.' });
    if (typeof quantity !== 'number' || quantity <= 0) return res.status(400).json({ success: false, message: 'quantity deve ser número positivo.' });
    if (!['entry', 'exit'].includes(type)) return res.status(400).json({ success: false, message: 'type deve ser "entry" ou "exit".' });

    session.startTransaction();
    const product = await Product.findById(productId).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Produto não encontrado.' });
    }

    if (type === 'exit' && product.quantity < quantity) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Quantidade insuficiente em estoque.' });
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

    return res.status(201).json({ success: true, data: movement[0], product, alert });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ success: false, message: 'Erro ao criar movimentação.', error: (err as Error).message });
  }
};

export const getMovements = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { productId, userId, type, from, to, page = 1, limit = 50 } = req.query;
    const filter: any = {};

    if (productId && typeof productId === 'string') {
      if (!isValidId(productId)) return res.status(400).json({ success: false, message: 'productId inválido.' });
      filter.productId = productId;
    }
    if (userId && typeof userId === 'string') {
      if (!isValidId(userId)) return res.status(400).json({ success: false, message: 'userId inválido.' });
      filter.userId = userId;
    }
    if (type && typeof type === 'string') {
      if (!['entry', 'exit'].includes(type)) return res.status(400).json({ success: false, message: 'type inválido.' });
      filter.type = type;
    }
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(String(from));
      if (to) filter.date.$lte = new Date(String(to));
    }

    const p = Math.max(1, Number(page));
    const l = Math.max(1, Number(limit));
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      MovementModel.find(filter).sort({ date: -1 }).skip(skip).limit(l).populate('productId', 'name').populate('userId', 'name'),
      MovementModel.countDocuments(filter)
    ]);

    return res.status(200).json({ success: true, data: items, meta: { total, page: p, limit: l } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao listar movimentações.', error: (err as Error).message });
  }
};

export const getMovementById = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    if (!isValidId(typeof id === 'string' ? id : undefined)) return res.status(400).json({ success: false, message: 'ID inválido.' });
    const movement = await MovementModel.findById(id).populate('productId', 'name').populate('userId', 'name');
    if (!movement) return res.status(404).json({ success: false, message: 'Movimentação não encontrada.' });
    return res.status(200).json({ success: true, data: movement });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao obter movimentação.', error: (err as Error).message });
  }
};

/**
 * Deleta uma movimentação e reverte o efeito no estoque (se possível).
 * Nota: operação sensível — valida conflitos e evita estoque negativo.
 */
export const deleteMovement = async (req: NextApiRequest, res: NextApiResponse) => {
  const session = await mongoose.startSession();
  try {
    const { id } = req.query;
    if (!isValidId(typeof id === 'string' ? id : undefined)) return res.status(400).json({ success: false, message: 'ID inválido.' });

    session.startTransaction();
    const movement = await MovementModel.findById(id).session(session);
    if (!movement) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Movimentação não encontrada.' });
    }

    const product = await Product.findById(movement.productId).session(session);
    if (!product) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Produto relacionado não encontrado.' });
    }

    // Reverter: se a movimentação foi 'entry' subtrai, se 'exit' soma
    const revertDelta = movement.type === 'entry' ? -movement.quantity : movement.quantity;
    if (product.quantity + revertDelta < 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Exclusão causaria estoque negativo. Operação cancelada.' });
    }

    product.quantity += revertDelta;
    product.updatedAt = new Date();
    await product.save({ session });

    await movement.deleteOne({ session });

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ success: true, message: 'Movimentação excluída e estoque revertido.', product });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({ success: false, message: 'Erro ao excluir movimentação.', error: (err as Error).message });
  }
};

export default {
  createMovement,
  getMovements,
  getMovementById,
  deleteMovement
};