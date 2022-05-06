module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es2021: true
    },
    extends: ["airbnb-base"],
    parserOptions: {
        ecmaVersion: 12
    },
    plugins: ["prettier"],
    rules: {
        "keyword-spacing": [
            "error",
            {
                before: true,
                after: true
            }
        ],
        indent: ["error", 4],
        quotes: ["error", "double"],
        "comma-dangle": ["error", "never"],
        semi: ["error", "never"],
        "no-underscore-dangle": ["error", { allow: [] }],
        "no-param-reassign": ["error", { props: false }],
        "no-console": ["error", { allow: ["warn", "log", "error", "debug"] }],
        "operator-linebreak": ["error", "after"],
        "new-cap": ["warn", { newIsCap: false }],
        "max-len": ["error", { code: 230 }],
        "function-paren-newline": ["warn", { minItems: 4 }],
        "no-restricted-syntax": ["error", "LabeledStatement", "WithStatement"],
        "class-methods-use-this": "off",
        "consistent-return": "warn"
    }
}
