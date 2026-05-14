import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  // Desabilita o @cloudflare/vite-plugin — deploy alvo é Vercel, não Cloudflare Workers.
  cloudflare: false,
  tanstackStart: {
    // Modo SPA: build estático sem SSR, ideal para dashboard privado.
    spa: { enabled: true },
  },
});
