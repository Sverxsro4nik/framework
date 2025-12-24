import { setAttributes } from './attributes';
import { addEventListeners } from './events';
import { DOM_TYPES } from './h';
import { enqueueJobs } from './scheduler.js';
import { extractPropsAndEvents } from './utils/props';

export function mountDOM(vdom, parentEl, index, hostComponent = null) {
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

export function createComponentNode(vdom, parentEl, index, hostComponent) {
	const { tag: Component, children } = vdom;
	const { props, events } = extractPropsAndEvents(vdom);
	const component = new Component(props, events, hostComponent);
	component.setExternalContent(children);

	component.mount(parentEl, index);
	vdom.el = component.firstElement;
}
