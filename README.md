# PraUnidade

Aplicação web para [descrição do propósito do PraUnidade].

## Stack
- React + Vite
- Firebase (Firestore + Authentication)
- Deploy: Vercel

## Branches

| Branch | Propósito |
|---|---|
| `main` | Produção. Deploy automático para `praunidade-prod`. |
| `develop` | Homologação/staging. Deploy automático para `procdd-staging`. |
| `feature/dev-local` | Desenvolvimento local de features. Mescla em `develop`. |

## Ambientes

### Firebase

| Ambiente | Projeto Firebase |
|---|---|
| Produção | `praunidade-prod` |
| Staging | `procdd-staging` |

### Vercel

| Ambiente | Projeto Vercel |
|---|---|
| Produção | `praunidade-prod` |
| Staging | `procdd-staging` |

## Configuração local

```bash
git clone https://github.com/<org>/praunidade.git
cd praunidade
npm install
cp .env.example .env.development
npm run dev
```

## Variáveis de ambiente

Cada ambiente possui seu próprio arquivo (`.env.development`, `.env.staging`, `.env.production`) com as credenciais do respectivo projeto Firebase. Nunca commitar arquivos `.env*` reais — use `.env.example` como referência.