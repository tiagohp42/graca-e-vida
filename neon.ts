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
      // E-mails da equipe que podem entrar na área /admin/ (separados por vírgula). Fica no .env.local.
      env: {
        ADMIN_EMAILS: process.env.ADMIN_EMAILS!,
        // O segredo do Realtime não é injetado nas Functions (e o prefixo NEON_ é reservado)
        REALTIME_SECRET: process.env.NEON_REALTIME_SECRET!,
      },
    },
  },
  buckets: {
    // "private" is the default; use "public_read" for anonymous reads
    assets: { access: "private" },
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
