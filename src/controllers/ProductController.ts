import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import Product, { IProduct } from '../models/Product';

const isValidId = (id: string) => mongoose.isValidObjectId(id);

export const createProduct = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { name, description, quantity = 0, minimumStock = 0 } = req.body;
    if (!name || typeof name !== 'string') return res.status(400).json({ success: false, message: 'Campo "name" é obrigatório.' });
    if (quantity < 0 || minimumStock < 0) return res.status(400).json({ success: false, message: 'Quantidades não podem ser negativas.' });

    const product = new Product({ name, description: description || '', quantity, minimumStock });
    await product.save();
    return res.status(201).json({ success: true, data: product });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao criar produto.', error: (err as Error).message });
  }
};

export const getProducts = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const q = String(req.query.q || '').trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 50);
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

    return res.status(200).json({ success: true, data: items, meta: { total, page, limit } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao listar produtos.', error: (err as Error).message });
  }
};

export const getProductById = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string' || !isValidId(id)) return res.status(400).json({ success: false, message: 'ID inválido.' });

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: 'Produto não encontrado.' });

    return res.status(200).json({ success: true, data: product });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao obter produto.', error: (err as Error).message });
  }
};

export const updateProduct = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string' || !isValidId(id)) return res.status(400).json({ success: false, message: 'ID inválido.' });

    const updates: Partial<IProduct> = req.body;
    if (updates.quantity !== undefined && updates.quantity < 0) return res.status(400).json({ success: false, message: 'quantity não pode ser negativa.' });
    if (updates.minimumStock !== undefined && updates.minimumStock < 0) return res.status(400).json({ success: false, message: 'minimumStock não pode ser negativo.' });

    const product = await Product.findByIdAndUpdate(id, { ...updates, updatedAt: new Date() }, { new: true });
    if (!product) return res.status(404).json({ success: false, message: 'Produto não encontrado para atualização.' });

    return res.status(200).json({ success: true, data: product });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao atualizar produto.', error: (err as Error).message });
  }
};

export const deleteProduct = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    if (!id || typeof id !== 'string' || !isValidId(id)) return res.status(400).json({ success: false, message: 'ID inválido.' });

    const product = await Product.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ success: false, message: 'Produto não encontrado para exclusão.' });

    return res.status(200).json({ success: true, message: 'Produto excluído com sucesso.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao excluir produto.', error: (err as Error).message });
  }
};

/**
 * changeStock:
 * body: { productId: string, type: 'entry'|'exit', amount: number, user?: string, date?: string }
 * - realiza entrada/saída, valida limites e retorna alerta quando abaixo do mínimo
 */
export const changeStock = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { productId, type, amount = 0, user, date } = req.body;
    if (!productId || !isValidId(productId)) return res.status(400).json({ success: false, message: 'productId inválido.' });
    if (!['entry', 'exit'].includes(type)) return res.status(400).json({ success: false, message: 'type deve ser "entry" ou "exit".' });
    if (typeof amount !== 'number' || amount <= 0) return res.status(400).json({ success: false, message: 'amount deve ser número positivo.' });

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Produto não encontrado.' });

    if (type === 'exit' && product.quantity < amount) {
      return res.status(400).json({ success: false, message: 'Quantidade insuficiente em estoque.' });
    }

    const inc = type === 'entry' ? amount : -amount;
    product.quantity += inc;
    product.updatedAt = new Date();
    await product.save();

    const belowMin = product.quantity < product.minimumStock;
    const alert = belowMin ? { message: 'Estoque abaixo do mínimo configurado.', current: product.quantity, minimum: product.minimumStock } : null;

    // Observação: gravação do histórico de movimentações deveria ser feita em uma collection Movement.
    // Aqui apenas retorna dados e alerta. Integrar com Movement model em próxima etapa.
    return res.status(200).json({
      success: true,
      data: product,
      movement: { type, amount, user: user || 'unknown', date: date || new Date().toISOString() },
      alert
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao alterar estoque.', error: (err as Error).message });
  }
};

export default {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  changeStock
};