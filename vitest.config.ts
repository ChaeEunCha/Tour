import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
  resolve: {
    alias: {
      // Outside of Next.js's bundler, "server-only" resolves to a module
      // that unconditionally throws (see node_modules/server-only/index.js).
      // Next.js itself only avoids this by resolving the package's
      // "react-server" export condition to its no-op empty.js. Vitest runs
      // test files in a plain Node environment without that condition, so
      // alias the bare specifier straight to the package's own empty.js —
      // the same no-op Next.js would use — scoped to tests only.
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
});
