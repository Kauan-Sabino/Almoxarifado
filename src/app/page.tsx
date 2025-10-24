'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface UserData {
  nome: string;
  email: string;
}

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se o usuário está autenticado
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!token || !userStr) {
      router.push('/login');
      return;
    }

    try {
      const userData = JSON.parse(userStr);
      setUser(userData);
    } catch (error) {
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Sistema de Almoxarifado</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Olá, {user?.nome}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900">Bem-vindo ao Painel</h2>
          <p className="text-gray-600 mt-1">Acesse as principais áreas do sistema através dos cards abaixo.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Reusable Card component instances */}
          <Card
            title="Gestão de Produtos"
            description="Cadastre, edite e gerencie todos os produtos do almoxarifado."
            href="/produtos"
            color="blue"
            icon={
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            }
          />

          <Card
            title="Controle de Estoque"
            description="Gerencie entradas, saídas e acompanhe o nível do estoque."
            href="/estoque"
            color="green"
            icon={
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            }
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">Sistema de Almoxarifado © 2025</p>
        </div>
      </footer>
    </div>
  );
}

function Card({ title, description, href, color, icon }: { title: string; description: string; href: string; color: string; icon: React.ReactNode; }) {
  const iconBgMap: Record<string, string> = {
    blue: '#e6f2ff',
    green: '#ecf9f0',
    purple: '#f3edff',
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e6e6e6',
    borderRadius: 8,
    boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  };

  const iconWrapperStyle: React.CSSProperties = {
    background: iconBgMap[color] || '#f3f4f6',
    width: 48,
    height: 48,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const ctaStyle: React.CSSProperties = {
    display: 'inline-block',
    padding: '10px 12px',
    borderRadius: 4,
    color: '#fff',
    background: '#0366d6',
    textAlign: 'center',
    cursor: 'pointer'
  };

  return (
    <a href={href} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <div style={iconWrapperStyle}>{icon}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#111827' }}>{title}</h3>
            <p style={{ marginTop: 6, marginBottom: 0, color: '#6b7280' }}>{description}</p>
          </div>
        </div>

        <div style={{ marginTop: 20, marginLeft: 0 }}>
          <div style={ctaStyle}>Acessar</div>
        </div>
      </div>
    </a>
  );
}
