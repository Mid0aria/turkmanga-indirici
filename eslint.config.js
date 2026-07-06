import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        rules: {
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/no-explicit-any": "error",
            "no-console": "error",
            "prefer-const": "error",
            "no-var": "error",
        },
    },
    {
        ignores: [
            "dist/",
            "dist-scripts/",
            "node_modules/",
            "coverage/",
            "api-docs.json",
            "api-docs.html",
            "drizzle/",
            "ops/",
            "k8s/",
        ],
    },
);
