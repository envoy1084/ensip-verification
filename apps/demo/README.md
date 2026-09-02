# Record Verification demo

A Router-only TanStack application for trying the Record Verification SDK.

Create a local environment file and add a WalletConnect project ID from the
[Reown dashboard](https://dashboard.reown.com/):

```bash
cp .env.example .env.local
```

Then, from the repository root:

```bash
pnpm install
pnpm --filter @repo/demo dev
```

The application is restricted to Ethereum mainnet. Injected wallets work
locally; WalletConnect requires a valid `VITE_WALLETCONNECT_PROJECT_ID`.

Run the project checks with:

```bash
pnpm --filter @repo/demo lint
pnpm --filter @repo/demo typecheck
pnpm --filter @repo/demo build
```
