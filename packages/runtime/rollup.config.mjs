import cleanup from 'rollup-plugin-cleanup';
import filesize from 'rollup-plugin-filesize';

export default [
	{
		input: 'src/index.js',
		plugins: [
			cleanup({
				comments: 'none',
				sourceMap: true,
			}),
		],
		output: {
			file: 'dist/index.js',
			format: 'umd',
			name: 'SverxRuntime',
			sourcemap: true,
			plugins: [filesize()],
		},
	},
	{
		input: 'src/index.js',
		plugins: [
			cleanup({
				comments: 'none',
				sourceMap: true,
			}),
		],
		output: {
			file: 'dist/index.esm.js',
			format: 'es',
			sourcemap: true,
			plugins: [filesize()],
		},
	},
];
