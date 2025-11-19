export function addEventListener(eventName, handler, el, hostComponent = null) {
	function boundHandler(){
		hostComponent ? handler.apply(hostComponent, arguments) : handler( ...arguments);
	}

	el.addEventListener(eventName, boundHandler);
	return boundHandler;
}

export function addEventListeners(el, listeners = {}, hostComponent = null) {
	const addedListeners = {};

	Object.entries(listeners).forEach(([eventName, handler]) => {
		const listener = addEventListener(eventName, handler, el, hostComponent);
		addedListeners[eventName] = listener;
	});

	return addedListeners;
}

export function removeEventListeners(el, listeners = {}) {
	Object.entries(listeners).forEach(([eventName, handler]) => {
		el.removeEventListener(eventName, handler);
	});
}
