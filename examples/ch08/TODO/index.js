import { createApp, h, hString } from 'https://unpkg.com/sverx-runtime@1.1.3/dist/index.esm.js';

createApp({
	state: 0,
	reducers: {
		add: (state, amount) => state + amount,
		minus: (state, amount) => state - amount,
	},

	view: (state, emit) => {
		return h('div', {}, [
			h('button', { on: { click: () => emit('add', 1) } }, [hString('add')]),
			h('span', {}, [hString(state)]),
			h('button', { on: { click: () => emit('minus', 1) } }, [hString('minus')]),
		]);
	},
}).mount(document.body);
