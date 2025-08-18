/* eslint-env node */
module.exports = {
	root: true,
	env: { browser: true, es2022: true, node: true },
	parser: 'vue-eslint-parser',
	parserOptions: {
		parser: '@typescript-eslint/parser',
		ecmaVersion: 'latest',
		sourceType: 'module',
		extraFileExtensions: ['.vue'],
	},
	extends: [
		'plugin:vue/vue3-recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:@typescript-eslint/recommended-requiring-type-checking',
		'prettier',
	],
	plugins: ['vue', '@typescript-eslint'],
	rules: {
		'vue/multi-word-component-names': 'off',
		'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
	},
}
