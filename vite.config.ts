import react from "@vitejs/plugin-react-swc";
import { defineConfig, PluginOption } from "vite";

import sparkPlugin from "@github/spark/spark-vite-plugin";
import createIconImportProxy from "@github/spark/vitePhosphorIconProxyPlugin";
import { resolve } from 'path'

const projectRoot = process.env.PROJECT_ROOT || import.meta.dirname

// Tailwind and shadcn/ui are gone: the interface is hand-written CSS built on
// the tokens in src/styles. That removed ~350 KB of unused Radix colour-scale
// CSS that was being shipped on every page load.
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // plugin-react-swc injects a fast-refresh preamble that never runs under
  // jsdom, so any component test fails with "can't detect preamble". Under
  // test we drop the plugin and let esbuild handle JSX with the automatic
  // runtime instead — same output, no refresh machinery.
  const isTest = mode === 'test' || process.env.VITEST === 'true';

  return {
    plugins: [
      ...(isTest ? [] : [react()]),
      // DO NOT REMOVE
      createIconImportProxy() as PluginOption,
      sparkPlugin() as PluginOption,
    ],
    esbuild: isTest ? { jsx: 'automatic' as const } : undefined,
    resolve: {
      alias: {
        '@': resolve(projectRoot, 'src')
      }
    },
    worker: {
      format: 'es'
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/tests/setup.ts']
    }
  };
});
