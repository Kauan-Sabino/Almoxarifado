import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../../../../models/User';

const MONGO_URI = process.env.MONGO_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/avaliacao_pratica';

async function connectToDatabase() {
  if (!MONGO_URI) throw new Error('MONGO_URI não configurado.');
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGO_URI);
}

const isValidId = (id?: string) => !!id && mongoose.isValidObjectId(id);

export async function GET(req: NextRequest, { params }: { params: { id?: string } }) {
  try {
    await connectToDatabase();

    const { id } = params;
    if (!isValidId(id)) {
      return NextResponse.json({ success: false, message: 'ID inválido.' }, { status: 400 });
    }

    const user = await User.findById(id).select('-senha');
    if (!user) return NextResponse.json({ success: false, message: 'Usuário não encontrado.' }, { status: 404 });

    return NextResponse.json({ success: true, data: user }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Erro ao obter usuário.', error: (err as Error).message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id?: string } }) {
  try {
    await connectToDatabase();

    const { id } = params;
    if (!isValidId(id)) {
      return NextResponse.json({ success: false, message: 'ID inválido.' }, { status: 400 });
    }

    const body = await req.json();
    const updates: any = {};
    if (body.nome !== undefined) updates.nome = String(body.nome).trim();
    if (body.email !== undefined) updates.email = String(body.email).trim().toLowerCase();
    if (body.senha !== undefined) updates.senha = String(body.senha);

    if (updates.email) {
      const other = await User.findOne({ email: updates.email, _id: { $ne: id } });
      if (other) return NextResponse.json({ success: false, message: 'Email já em uso por outro usuário.' }, { status: 409 });
    }

    if (updates.senha) {
      const hash = await bcrypt.hash(updates.senha, 10);
      updates.senha = hash;
    }

    updates.updatedAt = new Date();

    const user = await User.findByIdAndUpdate(id, updates, { new: true }).select('-senha');
    if (!user) return NextResponse.json({ success: false, message: 'Usuário não encontrado para atualização.' }, { status: 404 });

    return NextResponse.json({ success: true, data: user }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Erro ao atualizar usuário.', error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id?: string } }) {
  try {
    await connectToDatabase();

    const { id } = params;
    if (!isValidId(id)) {
      return NextResponse.json({ success: false, message: 'ID inválido.' }, { status: 400 });
    }

    const user = await User.findByIdAndDelete(id).select('-senha');
    if (!user) return NextResponse.json({ success: false, message: 'Usuário não encontrado para exclusão.' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'Usuário excluído com sucesso.', data: user }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, message: 'Erro ao excluir usuário.', error: (err as Error).message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';