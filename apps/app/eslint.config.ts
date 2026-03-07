import pluginVue from "eslint-plugin-vue"
import { defineConfigWithVueTs, vueTsConfigs } from "@vue/eslint-config-typescript"
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting"

export default defineConfigWithVueTs(
    {
        name: "app/files-to-lint",
        files: ["**/*.{ts,mts,tsx,vue}"],
    },

    {
        name: "app/files-to-ignore",
        ignores: ["**/dist/**", "**/dist-ssr/**", "**/coverage/**"],
    },

    pluginVue.configs["flat/essential"],
    vueTsConfigs.recommended,
    skipFormatting,
    {
        name: "app/overrides",
        rules: {
            "vue/multi-word-component-names": "off",
            "vue/html-indent": ["error", 4],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-empty-object-type": "off",
        },
    }
)
