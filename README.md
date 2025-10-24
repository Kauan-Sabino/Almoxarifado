## Visão Geral
O Aplicativo de Inventário de Armazém é uma solução web projetada para ajudar os usuários de armazéns a gerenciar o estoque de produtos com eficiência. O aplicativo permite que os usuários registrem produtos, acompanhem entradas e saídas e mantenham um nível mínimo de estoque com notificações de alerta. Ele também fornece um histórico completo de transações para rastreabilidade e transparência.

## Recursos
- Autenticação e autorização do usuário
- Registro e gerenciamento de produtos
- Rastreamento de entrada e saída de estoque
- Alertas de nível mínimo de estoque
- Histórico de transações com responsável e data
- Interface de usuário intuitiva

## Tecnologias

- *Frontend*: Next.js
- *Backend*: Node.js
- *Database*:MongoDB
- *Styling*:CSS

# Estrutura do Projeto

```
Avaliacao_Pratica
├── src
│   └── app
│   │    ├── api
│   │    │  ││└── Moviment
│   │    │  ││   │└──[id]
│   │    │  ││   │   └── route.ts
│   │    │  ││   └─ route.ts
│   │    │  │└── Product
│   │    │  │   │└──[id]
│   │    │  │   │   └── route.ts
│   │    │  │   └─ route.ts
│   │    │  └── user
│   │    │     ├── [id]
│   │    │     │  └── route.ts
│   │    │     ├── login
│   │    │     │  └── route.ts
│   │    │     └── register
│   │    │        └── route.ts
│   │    ├── cadastro
│   │    │   └── page.tsx
│   │    ├── componentes
│   │    │   └── dashboads            
│   │    │     │ └── ProductDashboad.tsx            
│   │    │     └── StockDashboad.tsx           
│   │    ├── produtos
│   │    │   └── page.tsx
│   │    └── login
│   │        └── page.tsx
│   │
│   ├── controllers
│   │   │  │  └── MovimentControler.ts
│   │   │  └── ProductController.ts
│   │   └── UserController.ts
│   ├── services
│   │   └── MongoDB.ts
│   └── models
│       │ │ └── Product.ts
│       │ └── Moviment.ts
│       └── User.ts
│
├── .env.local
├── next.config.js
├── tsconfig.json
├── package.json
└── README.md
```

# Diagrama de classe

```mermaid

classDiagram

    class User{
        _String userId
        +String nome
        +String email
        +String senha
        +login()
        +logout()
        +CRUD()
    }

    class Product{
        _String productId
        +String name
        +String description
        +number quantity
        +number minimumStock 
        +date createdAt 
        +date updatedAt 
        +CRUD()
    }

    class Moviment{
        +String productId
        +number quantity
        +type 'entry' | 'exit'
        +date Date
        +String userId
        +CRUD() 
    }

    Usuario "1" -- "1+" OrdemServico: "é responsavel por"
    Equipamento "1" -- "1+" OrdemServico: "associada a" 

```marmaid