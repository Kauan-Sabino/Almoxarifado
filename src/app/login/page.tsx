'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validate = () => {
    if (!email.trim()) return 'Email é obrigatório.'
    if (!senha) return 'Senha é obrigatória.'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const v = validate()
    if (v) {
      setError(v)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/user/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.message || 'Falha na autenticação.')
        // após informar motivo, permanece na tela (pode redirecionar novamente se desejar)
        setLoading(false)
        return
      }

      // sucesso: salvar token e user e redirecionar
  if (json?.token) localStorage.setItem('token', json.token)
  if (json?.data) localStorage.setItem('user', JSON.stringify(json.data))
  // redirect to home (root)
  router.push('/')
    } catch (err) {
      setError('Erro de rede. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
      <form onSubmit={handleSubmit} style={{ width: 360, padding: 24, border: '1px solid #e6e6e6', borderRadius: 8, boxShadow: '0 6px 18px rgba(0,0,0,0.06)' }}>
        <h2 style={{ margin: '0 0 12px' }}>Entrar</h2>

        <label style={{ display: 'block', marginBottom: 8 }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Email</div>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@exemplo.com"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #ccc' }}
            autoComplete="username"
          />
        </label>

        <label style={{ display: 'block', marginBottom: 12 }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>Senha</div>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="********"
            style={{ width: '100%', padding: '8px 10px', borderRadius: 4, border: '1px solid #ccc' }}
            autoComplete="current-password"
          />
        </label>

        {error && <div role="alert" style={{ color: '#b00020', marginBottom: 12 }}>{error}</div>}

        <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px 12px', background: '#0366d6', color: '#fff', border: 'none', borderRadius: 4, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <div style={{ marginTop: 12, fontSize: 13, color: '#666' }}>
          Não tem conta?{' '}
          <a href="/cadastro" style={{ color: '#0366d6', textDecoration: 'none', fontWeight: 500 }}>
            Cadastre-se aqui
          </a>
        </div>
      </form>
    </div>
  )
}