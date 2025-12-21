import { destroyDOM } from './destroy-dom';
import { h } from './h';
import { mountDOM } from './mount-dom';

export function createApp(RootComponent, props = {}) {
	let parentEl = null;
	let vdom = null;
	let isMounted = false;

	function reset() {
		parentEl = null;
		isMounted = false;
		vdom = null;
	}

	return {
		mount(_parentEl) {
			if (isMounted) {
				throw new Error('App is already mounted');
			}

			parentEl = _parentEl;
			vdom = h(RootComponent, props);
			mountDOM(vdom, parentEl);
			isMounted = true;
		},

		unmount() {
			if (!isMounted) {
				throw new Error('App is not mounted');
			}

			destroyDOM(vdom);
			reset();
		},
	};
}
