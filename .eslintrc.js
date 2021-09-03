module.exports = {
  root: true,
  extends: ['eslint:recommended'],
  plugins: ['sort-imports-es6-autofix'],
  parserOptions: {
    sourceType: 'module',
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  globals: {
    L: true,
    define: true,
  },
  rules: {
    'arrow-body-style': 'error',
    'arrow-parens': 'error',
    'arrow-spacing': 'error',
    'array-bracket-spacing': ['error', 'never'],
    'brace-style': 'error',
    'comma-dangle': ['error', { arrays: 'always-multiline', objects: 'always-multiline' }],
    'comma-spacing': 'error',
    'comma-style': 'error',
    'computed-property-spacing': 'error',
    'curly': ['error', 'all'],
    'eqeqeq': 'error',
    'eol-last': 'error',
    'func-call-spacing': 'error',
    'indent': [
      'error', 2,
      { ignoredNodes: ['AwaitExpression', 'MemberExpression'], SwitchCase: 1 },
    ],
    'key-spacing': 'error',
    'keyword-spacing': 'error',
    'max-len': ['error', { code: 120 }],
    'no-empty': ['error', { allowEmptyCatch: true }],
    'no-implicit-coercion': 'error',
    'no-lonely-if': 'error',
    'no-mixed-operators': 'error',
    'no-multi-spaces': 'error',
    'no-return-await': 'error',
    'no-tabs': 'error',
    'no-trailing-spaces': 'error',
    'no-unneeded-ternary': 'error',
    //'no-unused-expressions': 'error',
    'no-useless-computed-key': 'error',
    'no-useless-concat': 'error',
    'no-var': 'error',
    'no-whitespace-before-property': 'error',
    'object-curly-spacing': ['error', 'always'],
    'object-shorthand': 'error',
    //'operator-linebreak': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-const': 'error',
    'prefer-destructuring': 'error',
    'prefer-object-spread': 'error',
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
    'quote-props': ['error', 'consistent-as-needed'],
    'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: false }],
    'require-await': 'error',
    'rest-spread-spacing': 'error',
    'semi': 'error',
    'semi-style': 'error',
    'sort-imports-es6-autofix/sort-imports-es6': [
      'error',
      { memberSyntaxSortOrder: ['none', 'single', 'multiple', 'all'] },
    ],
    'space-before-function-paren': [
      'error',
      { anonymous: 'always', asyncArrow: 'always', named: 'never' },
    ],
    'space-in-parens': 'error',
    'space-infix-ops': 'error',
    'template-curly-spacing': 'error',
  },
};
