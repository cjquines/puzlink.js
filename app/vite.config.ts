import * as url from "node:url";
import { defineConfig } from "vite";
import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";

export default defineConfig((env) => ({
  base: "",
  build: {
    rolldownOptions: {
      treeshake: {
        moduleSideEffects: [{ test: /puzlink/, sideEffects: false }],
      },
    },
  },
  plugins: [
    react(),
    babel({
      presets: [reactCompilerPreset()],
      plugins: [["@babel/plugin-proposal-decorators", { version: "2023-11" }]],
    }),
  ],
  ...(env.command === "build"
    ? {}
    : {
        resolve: {
          alias: {
            puzlink: url.fileURLToPath(
              new URL("../src/index.ts", import.meta.url),
            ),
          },
        },
      }),
}));
