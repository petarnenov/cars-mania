import vue from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

export default [
	// Vue recommended first
	...vue.configs['flat/recommended'],
	{
		files: ['**/*.{ts,vue}'],
		languageOptions: {
			parser: vueParser,
			parserOptions: {
				parser: tsParser,
				ecmaVersion: 'latest',
				sourceType: 'module',
				extraFileExtensions: ['.vue'],
			},
		},
		plugins: { vue, '@typescript-eslint': tsPlugin },
		rules: {
			// Focus on unused only; relax stylistic Vue rules for this project
			'vue/multi-word-component-names': 'off',
			'vue/html-indent': 'off',
			'vue/singleline-html-element-content-newline': 'off',
			'vue/max-attributes-per-line': 'off',
			'@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
		},
	},
]
