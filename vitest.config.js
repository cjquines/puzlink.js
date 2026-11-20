import { transform } from "esbuild";
import { defineConfig } from "vitest/config";

// oxc doesn't lower decorators
export default defineConfig({
  oxc: false,
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
