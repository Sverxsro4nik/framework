export function addEventListener(eventName, handler, el) {
	el.addEventListener(eventName, handler);

	return handler;
}

export function addEventListeners(el, listeners = {}) {
	const addedListeners = {};

	Object.entries(listeners).forEach(([eventName, handler]) => {
		const listener = addEventListener(eventName, handler, el);
		addedListeners[eventName] = listener;
	});

	return addedListeners;
}

export function removeEventListeners(el, listeners = {}) {
	Object.entries(listeners).forEach(([eventName, handler]) => {
		el.removeEventListener(eventName, handler);
	});
}
