import { useState, useEffect, FormEvent } from 'react';
import { IProduct } from '@/models/Product';

interface ProductFormData {
  name: string;
  description: string;
  quantity: number;
  minimumStock: number;
}

const ProductDashboard = () => {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingProduct, setEditingProduct] = useState<IProduct | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    quantity: 0,
    minimumStock: 0
  });

  // Fetch products
  const fetchProducts = async (query: string = '') => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/product?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      if (data.success) {
        setProducts(data.data);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Erro ao carregar produtos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Handle search
  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    fetchProducts(searchTerm);
  };

  // Handle form submission (create/update)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.description) {
      setError('Nome e descrição são obrigatórios');
      return;
    }

    if (formData.quantity < 0 || formData.minimumStock < 0) {
      setError('Quantidade e estoque mínimo devem ser positivos');
      return;
    }

    try {
      const url = editingProduct 
        ? `/api/product/${editingProduct._id}`
        : '/api/product';
      
      const response = await fetch(url, {
        method: editingProduct ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (data.success) {
        fetchProducts(searchTerm);
        resetForm();
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Erro ao salvar produto');
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) {
      return;
    }

    try {
      const response = await fetch(`/api/product/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      if (data.success) {
        fetchProducts(searchTerm);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Erro ao excluir produto');
    }
  };

  // Handle edit
  const handleEdit = (product: IProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      quantity: product.quantity,
      minimumStock: product.minimumStock
    });
  };

  // Reset form
  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      quantity: 0,
      minimumStock: 0
    });
    setError('');
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e6e6e6',
    borderRadius: 8,
    boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
    padding: 20,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 4,
    border: '1px solid #ccc',
  };

  const primaryBtn: React.CSSProperties = {
    padding: '10px 12px',
    background: '#0366d6',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer'
  };

  const dangerBtn: React.CSSProperties = {
    padding: '10px 12px',
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer'
  };

  const secondaryBtn: React.CSSProperties = {
    padding: '10px 12px',
    background: '#6b7280',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer'
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Gerenciamento de Produtos</h1>

      {/* Search card */}
      <div style={{ marginBottom: 16, ...cardStyle }}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar produtos..."
              style={{ flex: 1, ...inputStyle }}
            />
            <button type="submit" style={primaryBtn}>Buscar</button>
          </div>
        </form>
      </div>

      {/* Product form card */}
      <div style={{ marginBottom: 20, ...cardStyle }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>

        {error && (
          <div style={{ marginBottom: 12, padding: 8, background: '#fee2e2', color: '#991b1b', borderRadius: 6 }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6 }}>Nome*</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6 }}>Descrição*</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={inputStyle}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6 }}>Quantidade</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                style={inputStyle}
                min={0}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: 6 }}>Estoque Mínimo</label>
              <input
                type="number"
                value={formData.minimumStock}
                onChange={(e) => setFormData({ ...formData, minimumStock: Number(e.target.value) })}
                style={inputStyle}
                min={0}
              />
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 12 }}>
            <button type="submit" style={primaryBtn}>{editingProduct ? 'Atualizar' : 'Criar'}</button>
            <button type="button" onClick={resetForm} style={secondaryBtn}>Cancelar</button>
          </div>
        </form>
      </div>

      {/* Products table card */}
      <div style={{ marginBottom: 16, ...cardStyle }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f3f4f6' }}>
                <th style={{ padding: 10, textAlign: 'left' }}>Nome</th>
                <th style={{ padding: 10, textAlign: 'left' }}>Descrição</th>
                <th style={{ padding: 10, textAlign: 'right' }}>Quantidade</th>
                <th style={{ padding: 10, textAlign: 'right' }}>Estoque Mínimo</th>
                <th style={{ padding: 10, textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 16 }}>Carregando...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: 16 }}>Nenhum produto encontrado</td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product._id as string} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: 10 }}>{product.name}</td>
                    <td style={{ padding: 10 }}>{product.description}</td>
                    <td style={{ padding: 10, textAlign: 'right' }}>{product.quantity}</td>
                    <td style={{ padding: 10, textAlign: 'right' }}>{product.minimumStock}</td>
                    <td style={{ padding: 10, textAlign: 'center' }}>
                      <button onClick={() => handleEdit(product)} style={{ marginRight: 8, ...primaryBtn }}>Editar</button>
                      <button onClick={() => handleDelete(product._id as string)} style={dangerBtn}>Excluir</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Back to main page button */}
      <div style={{ marginTop: 12 }}>
        <a href="/" style={{ display: 'inline-block', textDecoration: 'none' }}>
          <div style={{ ...secondaryBtn }}>Voltar para Página Principal</div>
        </a>
      </div>
    </div>
  );
};

export default ProductDashboard;
