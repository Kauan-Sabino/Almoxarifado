'use client';

import { useState, useEffect } from 'react';
import { IProduct } from '@/models/Product';
import { Movement } from '@/models/Moviment';

interface StockMovement {
  productId: string;
  userId: string;
  quantity: number;
  type: 'entry' | 'exit';
  date: string;
}

const StockDashboard = () => {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [movementType, setMovementType] = useState<'entry' | 'exit'>('entry');
  const [quantity, setQuantity] = useState<number>(0);
  const [movementDate, setMovementDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [alert, setAlert] = useState<string | null>(null);

  // Quick Sort implementation for alphabetical sorting
  const quickSort = (arr: IProduct[]): IProduct[] => {
    if (arr.length <= 1) return arr;

    const pivot = arr[0];
    const left: IProduct[] = [];
    const right: IProduct[] = [];

    for (let i = 1; i < arr.length; i++) {
      if (arr[i].name.toLowerCase() < pivot.name.toLowerCase()) {
        left.push(arr[i]);
      } else {
        right.push(arr[i]);
      }
    }

    return [...quickSort(left), pivot, ...quickSort(right)];
  };

  // Fetch and sort products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/product');
      const data = await response.json();
      if (data.success) {
        // Apply Quick Sort for alphabetical ordering
        const sortedProducts = quickSort(data.data);
        setProducts(sortedProducts);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle stock movement
  const handleStockMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || quantity <= 0) {
      setError('Por favor, selecione um produto e insira uma quantidade válida');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setAlert(null);

      // Assuming we have a logged-in user with ID '1' for this example
      // In a real application, you would get this from your auth system
      const userId = '1';

      const movement: StockMovement = {
        productId: selectedProduct,
        userId,
        quantity,
        type: movementType,
        date: new Date(movementDate).toISOString(),
      };

      const response = await fetch('/api/movement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(movement),
      });

      const data = await response.json();

      if (data.success) {
        // Check for low stock alert
        if (data.alert) {
          setAlert(
            `ALERTA: ${data.alert.message} (Atual: ${data.alert.current}, Mínimo: ${data.alert.minimum})`
          );
        }
        fetchProducts(); // Refresh product list
        // Reset form
        setQuantity(0);
        setMovementDate(new Date().toISOString().split('T')[0]);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Erro ao processar movimentação de estoque');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Gestão de Estoque</h1>

      {/* Stock Movement Card */}
      <div style={{ marginBottom: 16, background: '#fff', border: '1px solid #e6e6e6', borderRadius: 8, padding: 20, boxShadow: '0 6px 18px rgba(0,0,0,0.06)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Movimentação de Estoque</h2>

        {error && (
          <div style={{ marginBottom: 12, padding: 8, background: '#fee2e2', color: '#991b1b', borderRadius: 6 }}>{error}</div>
        )}

        {alert && (
          <div style={{ marginBottom: 12, padding: 8, background: '#fffae6', color: '#92400e', borderRadius: 6 }}>{alert}</div>
        )}

        <form onSubmit={handleStockMovement} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Produto</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #ccc' }}
              required
            >
              <option value="">Selecione um produto</option>
              {products.map((product) => (
                <option key={product._id as string} value={product._id as string}>
                  {product.name} (Estoque atual: {product.quantity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Tipo de Movimentação</label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value as 'entry' | 'exit')}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #ccc' }}
              required
            >
              <option value="entry">Entrada</option>
              <option value="exit">Saída</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Quantidade</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #ccc' }}
              min={1}
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6 }}>Data da Movimentação</label>
            <input
              type="date"
              value={movementDate}
              onChange={(e) => setMovementDate(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #ccc' }}
              required
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              style={{ padding: '10px 12px', background: '#0366d6', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
            >
              {loading ? 'Processando...' : 'Realizar Movimentação'}
            </button>
          </div>
        </form>
      </div>

      {/* Products Table Card */}
      <div style={{ background: '#fff', border: '1px solid #e6e6e6', borderRadius: 8, padding: 0, boxShadow: '0 6px 18px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#6b7280', textTransform: 'uppercase' }}>Nome do Produto</th>
                <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#6b7280', textTransform: 'uppercase' }}>Descrição</th>
                <th style={{ padding: 12, textAlign: 'right', fontSize: 12, color: '#6b7280', textTransform: 'uppercase' }}>Quantidade em Estoque</th>
                <th style={{ padding: 12, textAlign: 'right', fontSize: 12, color: '#6b7280', textTransform: 'uppercase' }}>Estoque Mínimo</th>
                <th style={{ padding: 12, textAlign: 'center', fontSize: 12, color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: 16, textAlign: 'center' }}>Carregando...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 16, textAlign: 'center' }}>Nenhum produto encontrado</td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product._id as string} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 12 }}>{product.name}</td>
                    <td style={{ padding: 12 }}>{product.description}</td>
                    <td style={{ padding: 12, textAlign: 'right' }}>{product.quantity}</td>
                    <td style={{ padding: 12, textAlign: 'right' }}>{product.minimumStock}</td>
                    <td style={{ padding: 12, textAlign: 'center' }}>
                      <span style={{ padding: '4px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: product.quantity < product.minimumStock ? '#fee2e2' : '#ecfdf5', color: product.quantity < product.minimumStock ? '#991b1b' : '#065f46' }}>
                        {product.quantity < product.minimumStock ? 'Abaixo do Mínimo' : 'OK'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Back to main page button */}
      <div style={{ marginTop: 16 }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <div style={{ display: 'inline-block', padding: '10px 12px', borderRadius: 4, background: '#6b7280', color: '#fff' }}>Voltar para Página Principal</div>
        </a>
      </div>
    </div>
  );
};

export default StockDashboard;
