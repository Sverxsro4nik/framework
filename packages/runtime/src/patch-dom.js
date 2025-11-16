import { removeAttribute, removeStyle, setAttributes, setStyle } from './attributes';
import { destroyDOM } from './destroy-dom';
import { addEventListener } from './events';
import { DOM_TYPES, extractChildren } from './h';
import { mountDOM } from './mount-dom';
import { areNodesEqual } from './node-equal';
import { ARRAY_DIFF_OP, arraysDiff, arraysDiffSequence } from './utils/arrays';
import { objectsDiff } from './utils/objects';
import { isNotBlankOrEmptyString } from './utils/strings';

export function patchDOM(oldVdom, newVdom, parentEl) {
	if (!areNodesEqual(oldVdom, newVdom)) {
		const index = findIndexInParent(parentEl, oldVdom.el);
		destroyDOM(oldVdom);
		mountDOM(newVdom, parentEl, index);

		return newVdom;
	}
	newVdom.el = oldVdom.el;

	switch (newVdom.type) {
		case DOM_TYPES.TEXT: {
			patchText(oldVdom, newVdom);
			return newVdom;
		}
		case DOM_TYPES.ELEMENT: {
			patchElement(oldVdom, newVdom);
			break;
		}
	}

	patchChildren(oldVdom, newVdom);

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

function patchElement(oldVdom, newVdom) {
	const el = oldVdom.el;
	const { class: oldClass, style: oldStyle, on: oldEvents, ...oldAttrs } = oldVdom.props;
	const { class: newClass, style: newStyle, on: newEvents, ...newAttrs } = newVdom.props;

	const { listeners: oldListeners } = oldVdom;
	patchAttrs(el, oldAttrs, newAttrs);
	patchClasses(el, oldClass, newClass);
	patchStyle(el, oldStyle, newStyle);
	newVdom.listeners = patchEvents(el, oldListeners, oldEvents, newEvents);
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

function patchEvents(el, oldListeners = {}, oldEvents = {}, newEvents = {}) {
	const { added, removed, updated } = objectsDiff(oldEvents, newEvents);

	for (const key of removed.concat(updated)) {
		el.removeEventListener(key, oldListeners[key]);
	}

	const addedListeners = {};

	for (const eventName of added.concat(updated)) {
		const listener = addEventListener(eventName, newEvents[eventName], el);
		addedListeners[eventName] = listener;
	}

	return addedListeners;
}

function patchChildren(oldVdom, newVdom) {
	const newChildren = extractChildren(newVdom);
	const oldChildren = extractChildren(oldVdom);

	const parentEl = oldVdom.el;
	const diffSeq = arraysDiffSequence(oldChildren, newChildren, areNodesEqual);

	for (const operation of diffSeq) {
		const { originalIndex, index, item } = operation;
		switch (operation.op) {
			case ARRAY_DIFF_OP.ADD: {
				mountDOM(item, parentEl, index);
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
				const elAtTargetIndex = parentEl.childNodes[index];

				parentEl.insertBefore(el, elAtTargetIndex);
				patchDOM(oldChild, newChild, parentEl);

				break;
			}
			case ARRAY_DIFF_OP.NOOP: {
				patchDOM(oldChildren[originalIndex], newChildren[index], parentEl);
				break;
			}
		}
	}
}
