import { fileURLToPath, URL } from "node:url"
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"
import vueDevTools from "vite-plugin-vue-devtools"
import tailwindcss from "@tailwindcss/vite"

process.env.VITE_GOOGLE_MAPS_API_KEY = "AIzaSyCKYod6aTgm5V_ezwwM-F9a15GVoFJmVR8"

function getCommitSha(): string {
    // Prefer VITE_COMMIT_SHA env var (set in Docker builds)
    if (process.env.VITE_COMMIT_SHA && process.env.VITE_COMMIT_SHA !== "unknown") {
        return process.env.VITE_COMMIT_SHA
    }
    // Fallback to git (works on host, not in Docker)
    try {
        return execSync("git rev-parse --short HEAD").toString().trim()
    } catch {
        return "unknown"
    }
}

function versionJsonPlugin() {
    const commit = getCommitSha()
    return {
        name: "version-json",
        writeBundle(options: { dir?: string }) {
            const outDir = options.dir || "dist"
            fs.writeFileSync(
                path.resolve(outDir, "version.json"),
                JSON.stringify({ commit })
            )
        },
    }
}

export default defineConfig({
    plugins: [vue(), vueDevTools(), tailwindcss(), versionJsonPlugin()],
    publicDir: "public",
    server: {
        port: 8080,
        host: true,
        hmr: {
            host: process.env.VITE_HMR_HOST || "localhost",
            port: parseInt(process.env.VITE_HMR_PORT || "8080"),
            clientPort: 8084, // The port exposed by your proxy
        },
        watch: {
            useFsEvents: true,
        },
    },
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
})
