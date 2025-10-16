import { h, hFragment } from './packages/runtime/src/h';

hFragment([
	h('h1', { class: 'title' }, ['My counter']),
	h('div', { class: 'container' }, [
		h('button', ['decrement']),
		h('span', ['0']),
		h('button', ['increment']),
	]),
]);
