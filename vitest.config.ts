import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
    // Pure layout and reducer tests run in Node. Hook tests opt into jsdom with
    // a `// @vitest-environment jsdom` comment at the top of the file.
    environment: "node",
  },
});
