import type { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import * as productController from '../../../../controllers/ProductController';

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/avaliacao_pratica';

async function connectToDatabase() {
  if (!MONGO_URI) throw new Error('MONGO_URI não configurado.');
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectToDatabase();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao conectar ao banco de dados.', error: (err as Error).message });
  }

  // Todas as rotas aqui dependem do id presente na URL: /api/products/:id
  switch (req.method) {
    case 'GET':
      // Retorna um produto (getOne)
      return productController.getProductById(req, res);
    case 'PATCH':
      // Atualiza parcialmente (update)
      return productController.updateProduct(req, res);
    case 'DELETE':
      // Exclui (delete)
      return productController.deleteProduct(req, res);
    default:
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
      return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  }
}