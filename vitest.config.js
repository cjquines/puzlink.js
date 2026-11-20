import { transform } from "esbuild";
import { defaultServerConditions } from "vite";
import { defineConfig } from "vitest/config";

// oxc doesn't lower decorators
export default defineConfig({
  oxc: false,
  ssr: {
    resolve: { conditions: ["puzlink-source", ...defaultServerConditions] },
  },
  plugins: [
    {
      name: "esbuild-ts",
      async transform(code, id) {
        if (!id.endsWith(".ts")) return null;
        const result = await transform(code, {
          loader: "ts",
          target: "es2023",
          sourcemap: true,
          sourcefile: id,
        });
        return { code: result.code, map: result.map };
      },
    },
  ],
});
