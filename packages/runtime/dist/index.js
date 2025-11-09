(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined'
		? factory(exports)
		: typeof define === 'function' && define.amd
		? define(['exports'], factory)
		: ((global = typeof globalThis !== 'undefined' ? globalThis : global || self), factory((global.SverxRuntime = {})));
})(this, function (exports) {
	'use strict';

	function withoutNulls(array) {
		return array.filter((element) => element !== null).filter((element) => element !== undefined);
	}

	const DOM_TYPES = {
		TEXT: 'text',
		ELEMENT: 'element',
		FRAGMENT: 'fragment',
	};
	function h(tag, props = {}, children = []) {
		return {
			tag,
			props,
			children: mapTextNodes(withoutNulls(children)),
			type: DOM_TYPES.ELEMENT,
		};
	}
	function mapTextNodes(children) {
		return children.map((child) => (typeof child === 'string' ? hString(child) : child));
	}
	function hString(str) {
		return { type: DOM_TYPES.TEXT, value: str };
	}
	function hFragment(vNodes) {
		return {
			type: DOM_TYPES.FRAGMENT,
			children: mapTextNodes(withoutNulls(vNodes)),
		};
	}
	h('form', { class: 'login-form', action: 'login' }, [
		h('input', { type: 'text', name: 'user' }),
		h('input', { type: 'password', name: 'pass' }),
		h('button', { on: { click: 'login' } }, ['Log in']),
	]);

	function addEventListener(eventName, handler, el) {
		el.addEventListener(eventName, handler);
		return handler;
	}
	function addEventListeners(el, listeners = {}) {
		const addedListeners = {};
		Object.entries(listeners).forEach(([eventName, handler]) => {
			const listener = addEventListener(eventName, handler, el);
			addedListeners[eventName] = listener;
		});
		return addedListeners;
	}
	function removeEventListeners(el, listeners = {}) {
		Object.entries(listeners).forEach(([eventName, handler]) => {
			el.removeEventListener(eventName, handler);
		});
	}

	function destroyDOM(vdom) {
		const { type } = vdom;
		switch (type) {
			case DOM_TYPES.TEXT: {
				removeTextNode(vdom);
				break;
			}
			case DOM_TYPES.ELEMENT: {
				removeElementNode(vdom);
				break;
			}
			case DOM_TYPES.FRAGMENT: {
				removeFragmentNodes(vdom);
				break;
			}
			default: {
				throw new Error(`Can't destroy DOM of type: ${type}`);
			}
		}
		delete vdom.el;
	}
	function removeTextNode(vdom) {
		const { el } = vdom;
		el.remove();
	}
	function removeElementNode(vdom) {
		const { el, children, listeners } = vdom;
		el.remove();
		children.forEach(destroyDOM);
		if (listeners) {
			removeEventListeners(el, listeners);
			delete vdom.listeners;
		}
	}
	function removeFragmentNodes(vdom) {
		const { children } = vdom;
		children.forEach(destroyDOM);
	}

	class Dispatcher {
		#subs = new Map();
		#afterHandlers = [];
		subscribe(commandName, handler) {
			if (!this.#subs.has(commandName)) {
				this.#subs.set(commandName, []);
			}
			const handlers = this.#subs.get(commandName);
			if (handlers.includes(handler)) {
				return () => {};
			}
			handlers.push(handler);
			return () => {
				const idx = handlers.indexOf(handler);
				handlers.splice(idx, 1);
			};
		}
		afterEveryCommand(handler) {
			this.#afterHandlers.push(handler);
			return () => {
				const idx = this.#afterHandlers.indexOf(handler);
				this.#afterHandlers.splice(idx, 1);
			};
		}
		dispatch(commandName, payload) {
			if (this.#subs.has(commandName)) {
				this.#subs.get(commandName).forEach((handler) => handler(payload));
			} else {
				console.warn(`No handlers for command: ${commandName}`);
			}
			this.#afterHandlers.forEach((handler) => handler());
		}
	}

	function setAttributes(el, attrs) {
		const { class: className, style, ...otherAttrs } = attrs || {};
		if (className) {
			setClass(el, className);
		}
		if (style) {
			Object.entries(style).forEach(([prop, value]) => {
				setStyle(el, prop, value);
			});
		}
		for (const [name, value] of Object.entries(otherAttrs)) {
			setAttribute(el, name, value);
		}
	}
	function setClass(el, className) {
		el.className = '';
		if (typeof className === 'string') {
			el.className = className;
		}
		if (Array.isArray(className)) {
			el.classList.add(...className);
		}
	}
	function setStyle(el, name, value) {
		el.style[name] = value;
	}
	function setAttribute(el, name, value) {
		if (value === null) {
			removeAttribute(el, name);
		} else if (name.startsWith('data-')) {
			el.setAttribute(name, value);
		} else {
			el[name] = value;
		}
	}
	function removeAttribute(el, name) {
		el[name] = null;
		el.removeAttribute(name);
	}

	function mountDOM(vdom, parentEl) {
		switch (vdom.type) {
			case DOM_TYPES.TEXT: {
				createTextNode(vdom, parentEl);
				break;
			}
			case DOM_TYPES.ELEMENT: {
				createElementNode(vdom, parentEl);
				break;
			}
			case DOM_TYPES.FRAGMENT: {
				createFragmentNodes(vdom, parentEl);
				break;
			}
		}
	}
	function createTextNode(vdom, parentEl) {
		const { value } = vdom;
		const textNode = document.createTextNode(value);
		vdom.el = textNode;
		parentEl.append(textNode);
	}
	function createFragmentNodes(vdom, parentEl) {
		const { children } = vdom;
		vdom.el = parentEl;
		children.forEach((element) => {
			mountDOM(element, parentEl);
		});
	}
	function createElementNode(vdom, parentEl) {
		const { tag, props, children = [] } = vdom;
		const element = document.createElement(tag);
		addProps(element, props, vdom);
		vdom.el = element;
		children.forEach((child) => mountDOM(child, element));
		parentEl.append(element);
	}
	function addProps(el, props, vdom) {
		const { on: events, ...attrs } = props || {};
		vdom.listeners = addEventListeners(el, events);
		setAttributes(el, attrs);
	}

	function createApp({ state, view, reducers = {} }) {
		let parentEl = null;
		let vdom = null;
		const dispatcher = new Dispatcher();
		const subscriptions = [dispatcher.afterEveryCommand(renderApp)];
		function emit(eventName, payload) {
			dispatcher.dispatch(eventName, payload);
		}
		for (const actionName in reducers) {
			const reducer = reducers[actionName];
			const subs = dispatcher.subscribe(actionName, (payload) => {
				state = reducer(state, payload);
			});
			subscriptions.push(subs);
		}
		function renderApp() {
			if (vdom) {
				destroyDOM(vdom);
			}
			vdom = view(state, emit);
			mountDOM(vdom, parentEl);
		}
		return {
			mount(_parentEl) {
				parentEl = _parentEl;
				renderApp();
			},
			unmount() {
				destroyDOM(vdom);
				vdom = null;
				subscriptions.forEach((unsubscribe) => unsubscribe());
			},
		};
	}

	exports.createApp = createApp;
	exports.h = h;
	exports.hFragment = hFragment;
	exports.hString = hString;
});
//# sourceMappingURL=index.js.map
