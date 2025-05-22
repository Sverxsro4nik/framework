import cleanup from 'rollup-plugin-cleanup';
import filesize from 'rollup-plugin-filesize';

export default {
	input: 'src/index.js',
	plugins: [
		cleanup({
			comments: 'none',
			sourceMap: true,
		}),
	],
	output: {
		file: 'dist/index.js',
		format: 'esm',
		sourcemap: true,
		plugins: [filesize()],
	},
};
