import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));
const comfyAppStub = path.resolve(root, "test/stubs/comfyui-app.js");

/** @type {import('vite').Plugin} */
function resolveComfyUiApp() {
    return {
        name: "resolve-comfyui-app",
        resolveId(source) {
            if (source === "../../../scripts/app.js" || source.endsWith("/scripts/app.js")) {
                return comfyAppStub;
            }
            return null;
        },
    };
}

export default defineConfig({
    plugins: [resolveComfyUiApp()],
    test: {
        include: ["test/js/**/*.test.js"],
        environment: "node",
        pool: "threads",
        fileParallelism: true,
        testTimeout: 5000,
    },
});
