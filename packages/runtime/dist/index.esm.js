import equal from 'fast-deep-equal';

function addEventListener(eventName, handler, el, hostComponent = null) {
	function boundHandler(){
		hostComponent ? handler.apply(hostComponent, arguments) : handler( ...arguments);
	}
	el.addEventListener(eventName, boundHandler);
	return boundHandler;
}
function addEventListeners(el, listeners = {}, hostComponent = null) {
	const addedListeners = {};
	Object.entries(listeners).forEach(([eventName, handler]) => {
		const listener = addEventListener(eventName, handler, el, hostComponent);
		addedListeners[eventName] = listener;
	});
	return addedListeners;
}
function removeEventListeners(el, listeners = {}) {
	Object.entries(listeners).forEach(([eventName, handler]) => {
		el.removeEventListener(eventName, handler);
	});
}

const ARRAY_DIFF_OP = {
	ADD: 'add',
	REMOVE: 'remove',
	MOVE: 'move',
	NOOP: 'noop',
};
function withoutNulls(array) {
	return array.filter((element) => element !== null).filter((element) => element !== undefined);
}
function arraysDiff(oldArray, newArray) {
	return {
		added: newArray.filter((element) => !oldArray.includes(element)),
		removed: oldArray.filter((element) => !newArray.includes(element)),
	};
}
class ArrayWithOriginalIndices {
	#array = [];
	#originalIndices = [];
	#equalsFn;
	constructor(array, originalIndices, equalsFn) {
		this.#array = [...array];
		this.#originalIndices = array.map((_, index) => index);
		this.#equalsFn = equalsFn;
	}
	get length() {
		return this.#array.length;
	}
	isRemoval(index, newArray) {
		if (index >= this.length) {
			return false;
		}
		const item = this.#array[index];
		const indexInNewArray = newArray.findIndex((element) => this.#equalsFn(element, item));
		return indexInNewArray === -1;
	}
	removeItem(index) {
		const operation = {
			op: ARRAY_DIFF_OP.REMOVE,
			index,
			item: this.#array[index],
		};
		this.#array.splice(index, 1);
		this.#originalIndices.splice(index, 1);
		return operation;
	}
	isNoop(index, newArray) {
		if (index >= this.length) {
			return false;
		}
		const item = this.#array[index];
		const newItem = newArray[index];
		return this.#equalsFn(item, newItem);
	}
	originalIndexAt(index) {
		return this.#originalIndices[index];
	}
	noopItem(index) {
		return {
			op: ARRAY_DIFF_OP.NOOP,
			originalIndex: this.originalIndexAt(index),
			index,
			item: this.#array[index],
		};
	}
	isAddition(item, fromIdx) {
		return this.findIndexFrom(item, fromIdx) === -1;
	}
	findIndexFrom(index, fromIdx) {
		for (let i = fromIdx; i < this.length; i++) {
			if (this.#equalsFn(this.#array[i], index)) {
				return i;
			}
		}
		return -1;
	}
	addItem(item, index) {
		const operation = {
			op: ARRAY_DIFF_OP.ADD,
			index,
			item,
		};
		this.#array.splice(index, 0, item);
		this.#originalIndices.splice(index, 0, -1);
		return operation;
	}
	moveItem(item, toIndex) {
		const fromIndex = this.findIndexFrom(item, toIndex);
		const operation = {
			op: ARRAY_DIFF_OP.MOVE,
			originalIndex: this.originalIndexAt(fromIndex),
			from: fromIndex,
			index: toIndex,
			item: this.#array[fromIndex],
		};
		const [_item] = this.#array.splice(fromIndex, 1);
		this.#array.splice(toIndex, 0, _item);
		const [originalIndex] = this.#originalIndices.splice(fromIndex, 1);
		this.#originalIndices.splice(toIndex, 0, originalIndex);
		return operation;
	}
	removeItemsAfter(index) {
		const operations = [];
		while (this.length > index) {
			operations.push(this.removeItem(index));
		}
		return operations;
	}
}
function arraysDiffSequence(oldArray, newArray, equalsFn = (a, b) => a === b) {
	const sequence = [];
	const array = new ArrayWithOriginalIndices(oldArray, equalsFn);
	for (let index = 0; index < newArray.length; index++) {
		if (array.isRemoval(index, newArray)) {
			sequence.push(array.removeItem(index));
			index--;
			continue;
		}
		if (array.isNoop(index, newArray)) {
			sequence.push(array.noopItem(index));
			continue;
		}
		const item = newArray[index];
		if (array.isAddition(item, index)) {
			sequence.push(array.addItem(item, index));
			continue;
		}
		sequence.push(array.moveItem(item, index));
	}
	sequence.push(...array.removeItemsAfter(newArray.length));
	return sequence;
}

const DOM_TYPES = {
	TEXT: 'text',
	ELEMENT: 'element',
	FRAGMENT: 'fragment',
	COMPONENT: 'component',
};
function h(tag, props = {}, children = []) {
	const type = typeof tag === 'string' ? DOM_TYPES.ELEMENT : DOM_TYPES.COMPONENT;
	return {
		tag,
		props,
		type,
		children: mapTextNodes(withoutNulls(children)),
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
function extractChildren(vdom) {
	if (vdom.childer === null) {
		return [];
	}
	const children = [];
	for (const child of vdom.children) {
		if (child.type === DOM_TYPES.FRAGMENT) {
			children.push(...extractChildren(child));
		} else {
			children.push(child);
		}
	}
}

let isScheduled = false;
const jobs = [];
function enqueueJobs(job) {
	jobs.push(job);
	scheduleUpdate();
}
function scheduleUpdate() {
	if (isScheduled) return;
	isScheduled = true;
	queueMicrotask(processJobs);
}
function processJobs() {
	while (jobs.length) {
		const job = jobs.shift();
		const result = job();
		Promise.resolve(result)
			.then()
			.catch((error) => console.error(`[scheduler]: ${error}`));
	}
	isScheduled = false;
}
function nextTick() {
	scheduleUpdate();
	return flushPromises();
}
function flushPromises() {
	return new Promise((resolve) => setTimeout(resolve));
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
		case DOM_TYPES.COMPONENT: {
			vdom.component.unmount();
			enqueueJobs(() => vdom.component.onUnmounted());
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
function removeStyle(el, name) {
	el.style[name] = null;
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

function extractPropsAndEvents(vdom) {
	const { on: events = {}, ...props } = vdom.props;
	delete props.key;
	return { props, events };
}

function mountDOM(vdom, parentEl, index, hostComponent = null) {
	switch (vdom.type) {
		case DOM_TYPES.TEXT: {
			createTextNode(vdom, parentEl, index);
			break;
		}
		case DOM_TYPES.ELEMENT: {
			createElementNode(vdom, parentEl, index, hostComponent);
			break;
		}
		case DOM_TYPES.FRAGMENT: {
			createFragmentNodes(vdom, parentEl, index, hostComponent);
			break;
		}
		case DOM_TYPES.COMPONENT: {
			createComponentNode(vdom, parentEl, index, hostComponent);
			enqueueJobs(() => vdom.component.onMounted());
			break;
		}
	}
}
function createTextNode(vdom, parentEl, index) {
	const { value } = vdom;
	const textNode = document.createTextNode(value);
	vdom.el = textNode;
	insert(textNode, parentEl, index);
}
function createFragmentNodes(vdom, parentEl, index, hostComponent) {
	const { children } = vdom;
	vdom.el = parentEl;
	children.forEach((element, i) => {
		mountDOM(element, parentEl, index ? index + i : null, hostComponent);
	});
}
function createElementNode(vdom, parentEl, index, hostComponent) {
	const { tag, children = [] } = vdom;
	const element = document.createElement(tag);
	addProps(element, vdom, hostComponent);
	vdom.el = element;
	children.forEach((child) => mountDOM(child, element, null, hostComponent));
	insert(element, parentEl, index);
}
function addProps(el, props, vdom, hostComponent) {
	const { props: attrs, events } = extractPropsAndEvents(vdom);
	vdom.listeners = addEventListeners(el, events, hostComponent);
	setAttributes(el, attrs);
}
function insert(el, parentEl, index) {
	if (index === undefined || index === null) {
		parentEl.append(el);
		return;
	}
	if (index < 0) {
		throw new Error(`Index must be a positive integer, got ${index}`);
	}
	const children = parentEl.childNodes;
	if (index >= children.length) {
		parentEl.append(el);
	} else {
		parentEl.insertBefore(el, children[index]);
	}
}
function createComponentNode(vdom, parentEl, index, hostComponent) {
	const Component = vdom.tag;
	const { props, events } = extractPropsAndEvents(vdom);
	const component = new Component(props, events, hostComponent);
	component.mount(parentEl, index);
	vdom.el = component.firstElement;
}

function createApp(RootComponent, props = {}) {
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
			this.#subs.get(commandName).forEach(handler => handler(payload));
		} else {
			console.warn(`No handlers for command: ${commandName}`);
		}
		this.#afterHandlers.forEach(handler => handler());
	}
}

function areNodesEqual(nodeOne, nodeTwo) {
	if (nodeOne.type !== nodeTwo.type) {
		return false;
	}
	if (nodeOne.type === DOM_TYPES.ELEMENT) {
		const {
			tag: tagOne,
			props: { key: keyOne },
		} = nodeOne;
		const {
			tag: tagTwo,
			props: { key: keyTwo },
		} = nodeTwo;
		return tagOne === tagTwo && keyOne === keyTwo;
	}
	if (nodeOne.type === DOM_TYPES.COMPONENT) {
		const {
			tag: componentOne,
			props: { key: keyOne },
		} = nodeOne;
		const {
			tag: componentTwo,
			props: { key: keyTwo },
		} = nodeTwo;
		return componentOne === componentTwo && keyOne === keyTwo;
	}
	return true;
}

function objectsDiff(oldObj, newObj) {
	const oldKeys = Object.keys(oldObj);
	const newKeys = Object.keys(newObj);
	return {
		added: newKeys.filter((key) => !(key in oldObj)),
		removed: oldKeys.filter((key) => !(key in newObj)),
		updated: newKeys.filter((key) => key in oldObj && oldObj[key] !== newObj[key]),
	};
}
function hasOwnProperty(obj, prop) {
	return Object.prototype.hasOwnProperty.call(obj, prop);
}

function isNotEmptyString(str) {
	return str !== '';
}
function isNotBlankOrEmptyString(str) {
	return isNotEmptyString(str.trim());
}

function patchDOM(oldVdom, newVdom, parentEl, hostComponent = null) {
	if (!areNodesEqual(oldVdom, newVdom)) {
		const index = findIndexInParent(parentEl, oldVdom.el);
		destroyDOM(oldVdom);
		mountDOM(newVdom, parentEl, index, hostComponent);
		return newVdom;
	}
	newVdom.el = oldVdom.el;
	switch (newVdom.type) {
		case DOM_TYPES.TEXT: {
			patchText(oldVdom, newVdom);
			return newVdom;
		}
		case DOM_TYPES.ELEMENT: {
			patchElement(oldVdom, newVdom, hostComponent);
			break;
		}
		case DOM_TYPES.COMPONENT: {
			patchComponent(oldVdom, newVdom);
			break;
		}
	}
	patchChildren(oldVdom, newVdom, hostComponent);
	return newVdom;
}
function findIndexInParent(parentEl, el) {
	const index = Array.from(parentEl.childNodes).indexOf(el);
	return index === -1 ? null : index;
}
function patchText(oldVdom, newVdom) {
	const el = oldVdom.el;
	const { value: oldText } = oldVdom;
	const { value: newText } = newVdom;
	if (oldText !== newText) {
		el.textContent = newText;
	}
}
function patchElement(oldVdom, newVdom, hostComponent) {
	const el = oldVdom.el;
	const { class: oldClass, style: oldStyle, on: oldEvents, ...oldAttrs } = oldVdom.props;
	const { class: newClass, style: newStyle, on: newEvents, ...newAttrs } = newVdom.props;
	const { listeners: oldListeners } = oldVdom;
	patchAttrs(el, oldAttrs, newAttrs);
	patchClasses(el, oldClass, newClass);
	patchStyle(el, oldStyle, newStyle);
	newVdom.listeners = patchEvents(el, oldListeners, oldEvents, newEvents, hostComponent);
}
function patchAttrs(el, oldAttrs, newAttrs) {
	const { added, removed, updated } = objectsDiff(oldAttrs, newAttrs);
	for (const key of removed) {
		removeAttribute(el, key);
	}
	for (const attr of added.concat(updated)) {
		setAttributes(el, attr, newAttrs[attr]);
	}
}
function patchClasses(el, oldClass, newClass) {
	const oldClasses = toClassList(oldClass);
	const newClasses = toClassList(newClass);
	const { added, removed } = arraysDiff(oldClasses, newClasses);
	if (removed.length) {
		el.classList.remove(...removed);
	}
	if (added.length) {
		el.classList.add(...added);
	}
}
function toClassList(classes = '') {
	return Array.isArray(classes) ? classes.filter(isNotBlankOrEmptyString) : classes.split(/(\s+)/).filter(isNotBlankOrEmptyString);
}
function patchStyle(el, oldStyle = {}, newStyle = {}) {
	const { added, removed, updated } = objectsDiff(oldStyle, newStyle);
	for (const key of removed) {
		removeStyle(el, key);
	}
	for (const style of added.concat(updated)) {
		setStyle(el, style, newStyle[style]);
	}
}
function patchEvents(el, hostComponent, oldListeners = {}, oldEvents = {}, newEvents = {}) {
	const { added, removed, updated } = objectsDiff(oldEvents, newEvents);
	for (const key of removed.concat(updated)) {
		el.removeEventListener(key, oldListeners[key]);
	}
	const addedListeners = {};
	for (const eventName of added.concat(updated)) {
		const listener = addEventListener(eventName, newEvents[eventName], el, hostComponent);
		addedListeners[eventName] = listener;
	}
	return addedListeners;
}
function patchChildren(oldVdom, newVdom, hostComponent) {
	const newChildren = extractChildren(newVdom);
	const oldChildren = extractChildren(oldVdom);
	const parentEl = oldVdom.el;
	const diffSeq = arraysDiffSequence(oldChildren, newChildren, areNodesEqual);
	for (const operation of diffSeq) {
		const { originalIndex, index, item } = operation;
		const offset = hostComponent ? hostComponent.offset : 0;
		switch (operation.op) {
			case ARRAY_DIFF_OP.ADD: {
				mountDOM(item, parentEl, index + offset, hostComponent);
				break;
			}
			case ARRAY_DIFF_OP.REMOVE: {
				destroyDOM(item);
				break;
			}
			case ARRAY_DIFF_OP.MOVE: {
				const oldChild = oldChildren[originalIndex];
				const newChild = newChildren[index];
				const el = oldChild.el;
				const elAtTargetIndex = parentEl.childNodes[index + offset];
				parentEl.insertBefore(el, elAtTargetIndex);
				patchDOM(oldChild, newChild, parentEl, hostComponent);
				break;
			}
			case ARRAY_DIFF_OP.NOOP: {
				patchDOM(oldChildren[originalIndex], newChildren[index], parentEl, hostComponent);
				break;
			}
		}
	}
}
function patchComponent(oldVdom, newVdom) {
	const { component } = oldVdom;
	const { props } = extractPropsAndEvents(newVdom);
	component.updateProps(props);
	newVdom.component = component;
	newVdom.el = component.firstElement;
}

const emptyFn = () => {};
function defineComponent({ render, state, onMounted = emptyFn, onUnmounted = emptyFn, ...methods }) {
	class Component {
		#vdom = null;
		#hostEl = null;
		#isMounted = false;
		#eventHandlers = null;
		#parentComponent = null;
		#dispatcher = new Dispatcher();
		#subscriptions = [];
		constructor(props = {}, eventHandlers = {}, parentComponent = null) {
			this.props = props;
			this.state = state ? state(props) : {};
			this.#eventHandlers = eventHandlers;
			this.#parentComponent = parentComponent;
		}
		onMounted() {
			return Promise.resolve(onMounted.call(this));
		}
		onUnmounted() {
			return Promise.resolve(onUnmounted.call(this));
		}
		#wireEventHandlers() {
			this.#subscriptions = Object.entries(this.#eventHandlers).map(([eventName, handler]) => {
				this.#wireEventHandler(eventName, handler);
			});
		}
		#wireEventHandler(eventName, handler) {
			return this.#dispatcher.subscribe(eventName, (payload) => {
				if (this.#parentComponent) {
					handler.call(this.#parentComponent, payload);
				} else {
					handler(payload);
				}
			});
		}
		get elements() {
			if (this.#vdom === null) return [];
			if (this.#vdom.type === DOM_TYPES.FRAGMENT) {
				return extractChildren(this.#vdom).flatMap((child) => {
					if (child.type === DOM_TYPES.COMPONENT) {
						return child.elements;
					}
					return [child.el];
				});
			}
			return [this.#vdom.el];
		}
		get firstElement() {
			return this.elements[0];
		}
		get offset() {
			if (this.#vdom.type === DOM_TYPES.FRAGMENT) {
				return Array.from(this.#hostEl.children).indexOf(this.firstElement);
			}
			return 0;
		}
		render() {
			return render.call(this);
		}
		emit(eventName, payload) {
			this.#dispatcher.dispatch(eventName, payload);
		}
		updateProps(props) {
			const newProps = { ...this.props, ...props };
			if (equal(this.props, newProps)) {
				return;
			}
			this.props = newProps;
			this.#patch();
		}
		updateState(state) {
			this.state = { ...this.state, ...state };
			this.#patch();
		}
		mount(hostEl, index = null) {
			if (this.#isMounted) {
				throw new Error('Component is already mounted');
			}
			this.#vdom = this.render();
			mountDOM(this.#vdom, hostEl, index, this);
			this.#wireEventHandlers();
			this.#hostEl = hostEl;
			this.#isMounted = true;
		}
		unmount() {
			if (!this.#isMounted) {
				throw new Error('Component is not mounted');
			}
			destroyDOM(this.#vdom);
			this.#subscriptions.forEach((unsubscribe) => unsubscribe());
			this.#hostEl = null;
			this.#vdom = null;
			this.#isMounted = false;
			this.#subscriptions = [];
		}
		#patch() {
			if (!this.#isMounted) {
				throw new Error('Component is not mounted');
			}
			const vdom = this.render();
			this.#vdom = patchDOM(this.#vdom, vdom, this.#hostEl, this);
		}
	}
	for (const methodName in methods) {
		if (hasOwnProperty(Component, methodName)) {
			throw new Error(`Method ${methodName} is already defined on Component`);
		}
		Component.prototype[methodName] = methods[methodName];
	}
	return Component;
}

export { createApp, defineComponent, h, hFragment, hString, nextTick };
//# sourceMappingURL=index.esm.js.map
