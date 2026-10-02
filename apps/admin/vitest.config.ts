import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Unit tests for the admin app's pure logic (tree edits, pattern handling,
// header/footer modes). Runs in Node; the i18n helpers fall back to identity.
export default defineConfig({
    resolve: {
        alias: {
            "@": resolve(__dirname, "src"),
        },
    },
    test: {
        root: __dirname,
        include: ["src/**/*.test.ts"],
        environment: "node",
        // Let CSS files load (as raw text) so tokens.test.ts can check index.css.
        css: { include: [/\.css/] },
        setupFiles: [resolve(__dirname, "src/test/setup.ts")],
    },
});
