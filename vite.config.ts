import { defineConfig, loadEnv } from 'vite'
import type { PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(async ({ mode, command }) => {
  const plugins: PluginOption[] = [react()];
  try {
    // @ts-expect-error -- this optional ignored local plugin has no declaration file.
    const m = await import('./.vite-source-tags.js');
    plugins.push(m.sourceTags());
  } catch {
    // Source tags are an optional local development plugin.
  }

  if (command === 'serve') {
    plugins.push({
      name: 'local-api-functions',
      configureServer(server) {
        Object.assign(process.env, loadEnv(mode, process.cwd(), ''));

        server.middlewares.use(async (req, res, next) => {
          const requestUrl = new URL(req.url || '/', 'http://localhost');
          const route = requestUrl.pathname.match(/^\/api\/(content|appointments|inquiries|staff)\/?$/)?.[1];
          if (!route) return next();

          try {
            if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: 'Missing VITE_SUPABASE_URL or server-only SUPABASE_SERVICE_ROLE_KEY in the project root .env file.' }));
            }

            let body;
            if (req.method && !['GET', 'HEAD'].includes(req.method)) {
              const chunks = [];
              for await (const chunk of req) chunks.push(chunk);
              const rawBody = Buffer.concat(chunks).toString('utf8');
              body = rawBody ? JSON.parse(rawBody) : undefined;
            }

            const query = Object.fromEntries(requestUrl.searchParams.entries());
            Object.assign(req, { query, body });
            const moduleUrl = pathToFileURL(resolve(process.cwd(), 'api', `${route}.js`)).href;
            const { default: handler } = await import(moduleUrl);
            const response = {
              status(code: number) { res.statusCode = code; return this; },
              json(value: unknown) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(value));
                return this;
              },
              setHeader(name: string, value: string) { res.setHeader(name, value); return this; },
              end(value?: string) { res.end(value); return this; },
            };
            await handler(req, response);
          } catch (error) {
            console.error(`Local API request failed (${route}):`, error);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
            }
            if (!res.writableEnded) res.end(JSON.stringify({ error: 'The local API could not complete this request. Check the terminal for details.' }));
          }
        });
      },
    });
  }

  return {
    plugins,
    envPrefix: 'VITE_',
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            motion: ['framer-motion'],
            auth: ['@supabase/supabase-js'],
          },
        },
      },
    },
  };
})
