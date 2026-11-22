import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Declare your Neon services here
  preview: {
    realtime: true,
  },
  auth: true,
  aiGateway: true,
  functions: {
    api: {
      name: "API do site",
      source: "./backend/api.ts",
      // Super admins da área /admin/: id da conta no Neon Auth (separados por vírgula). Fica no .env.local.
      // O resto da equipe entra por link de convite e fica na tabela "equipe".
      env: {
        SUPER_ADMIN_IDS: process.env.SUPER_ADMIN_IDS!,
        // O segredo do Realtime não é injetado nas Functions (e o prefixo NEON_ é reservado)
        REALTIME_SECRET: process.env.NEON_REALTIME_SECRET!,
        // Assina o cache de sessão do login pelo próprio domínio (proxy do Neon Better Auth)
        AUTH_COOKIE_SECRET: process.env.AUTH_COOKIE_SECRET!,
        // Só nas branches de teste (Preview da Vercel); em produção fica vazio
        ...(process.env.ORIGENS_EXTRA ? { ORIGENS_EXTRA: process.env.ORIGENS_EXTRA } : {}),
      },
    },
  },
  buckets: {
    // "private" is the default; use "public_read" for anonymous reads
    assets: { access: "private" },
    // Artes dos eventos, mostradas no site
    eventos: { access: "public_read" },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
