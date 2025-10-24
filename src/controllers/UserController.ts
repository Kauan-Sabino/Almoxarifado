import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

const isValidId = (id?: string) => !!id && mongoose.isValidObjectId(id);
const JWT_SECRET: jwt.Secret = process.env.JWT_SECRET || 'MINHA_SENHA_SECRETA';
const JWT_EXPIRES_IN: jwt.SignOptions['expiresIn'] = (process.env.JWT_EXPIRES_IN || '1h') as jwt.SignOptions['expiresIn'];

function generateToken(user: IUser) {
  return jwt.sign(
    { id: user._id, email: user.email, nome: user.nome },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export const register = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { nome, email, senha } = req.body;
    if (!nome || !email || !senha) return res.status(400).json({ success: false, message: 'nome, email e senha são obrigatórios.' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ success: false, message: 'Email já cadastrado.' });

  // Let the User model pre-save hook hash the password to avoid double-hashing
  const user = new User({ nome, email, senha });
    await user.save();

    const token = generateToken(user);
    return res.status(201).json({ success: true, data: { id: user._id, nome: user.nome, email: user.email }, token });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao registrar usuário.', error: (err as Error).message });
  }
};

export const login = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { email, senha } = req.body;
    if (!email || !senha) return res.status(400).json({ success: false, message: 'email e senha são obrigatórios.' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });

    const match = await user.compareSenha(senha);
    if (!match) return res.status(401).json({ success: false, message: 'Credenciais inválidas.' });

    const token = generateToken(user);
    return res.status(200).json({ success: true, data: { id: user._id, nome: user.nome, email: user.email }, token });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao autenticar.', error: (err as Error).message });
  }
};

export const getUsers = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const q = String(req.query.q || '').trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Number(req.query.limit) || 50);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (q) {
      const re = new RegExp(q, 'i');
      filter.$or = [{ nome: re }, { email: re }];
    }

    const [items, total] = await Promise.all([
      User.find(filter).select('-senha').skip(skip).limit(limit).sort({ nome: 1 }),
      User.countDocuments(filter)
    ]);

    return res.status(200).json({ success: true, data: items, meta: { total, page, limit } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao listar usuários.', error: (err as Error).message });
  }
};

export const getUserById = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    if (!isValidId(typeof id === 'string' ? id : undefined)) return res.status(400).json({ success: false, message: 'ID inválido.' });

    const user = await User.findById(id).select('-senha');
    if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });

    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao obter usuário.', error: (err as Error).message });
  }
};

export const updateUser = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    if (!isValidId(typeof id === 'string' ? id : undefined)) return res.status(400).json({ success: false, message: 'ID inválido.' });

    const updates: Partial<IUser> = req.body;
    if (updates.email) {
      const other = await User.findOne({ email: updates.email, _id: { $ne: id } });
      if (other) return res.status(409).json({ success: false, message: 'Email já em uso por outro usuário.' });
    }

    if (updates.senha) {
      updates.senha = await bcrypt.hash(String(updates.senha), 10) as unknown as any;
    }

    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-senha');
    if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado para atualização.' });

    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao atualizar usuário.', error: (err as Error).message });
  }
};

export const deleteUser = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    if (!isValidId(typeof id === 'string' ? id : undefined)) return res.status(400).json({ success: false, message: 'ID inválido.' });

    const user = await User.findByIdAndDelete(id).select('-senha');
    if (!user) return res.status(404).json({ success: false, message: 'Usuário não encontrado para exclusão.' });

    return res.status(200).json({ success: true, message: 'Usuário excluído com sucesso.', data: user });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Erro ao excluir usuário.', error: (err as Error).message });
  }
};

export default {
  register,
  login,
  getUsers,
  getUserById,
  updateUser,
  deleteUser
};