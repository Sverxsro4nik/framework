/**
 * Проверяет, поддерживает ли браузер Web Share API
 * @returns {boolean}
 */
export function canShare() {
	return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * Проверяет, можно ли поделиться файлами
 * @returns {boolean}
 */
export function canShareFiles() {
	return canShare() && 'canShare' in navigator;
}

/**
 * Пытается поделиться данными через Web Share API
 * @param {ShareData} data - Данные для шаринга
 * @returns {Promise<void>}
 */
export async function share(data) {
	if (!canShare()) {
		throw new Error('Web Share API не поддерживается в этом браузере');
	}

	// Проверяем, можно ли поделиться этими данными (для файлов)
	if (canShareFiles() && !navigator.canShare(data)) {
		throw new Error('Невозможно поделиться этими данными');
	}

	try {
		await navigator.share(data);
	} catch (error) {
		// Пользователь отменил шаринг - это нормально, не пробрасываем ошибку
		if (error.name === 'AbortError') {
			return;
		}
		throw error;
	}
}

/**
 * Поделиться текстом и/или URL
 * @param {Object} options - Опции для шаринга
 * @param {string} [options.title] - Заголовок
 * @param {string} [options.text] - Текст для шаринга
 * @param {string} [options.url] - URL для шаринга
 * @returns {Promise<void>}
 */
export async function shareText({ title, text, url }) {
	return share({ title, text, url });
}

/**
 * Поделиться файлами
 * @param {Object} options - Опции для шаринга
 * @param {string} [options.title] - Заголовок
 * @param {string} [options.text] - Текст для шаринга
 * @param {File[]} options.files - Массив файлов для шаринга
 * @returns {Promise<void>}
 */
export async function shareFiles({ title, text, files }) {
	if (!canShareFiles()) {
		throw new Error('Шаринг файлов не поддерживается в этом браузере');
	}

	return share({ title, text, files });
}

/**
 * Fallback функция для шаринга через копирование в буфер обмена
 * @param {Object} options - Опции для шаринга
 * @param {string} [options.text] - Текст для копирования
 * @param {string} [options.url] - URL для копирования
 * @returns {Promise<void>}
 */
export async function shareFallback({ text, url }) {
	const shareText = [text, url].filter(Boolean).join('\n');

	if (!shareText) {
		throw new Error('Нет данных для шаринга');
	}

	// Пытаемся использовать Clipboard API
	if (navigator.clipboard && navigator.clipboard.writeText) {
		await navigator.clipboard.writeText(shareText);
		return;
	}

	// Fallback для старых браузеров
	const textArea = document.createElement('textarea');
	textArea.value = shareText;
	textArea.style.position = 'fixed';
	textArea.style.left = '-999999px';
	textArea.style.top = '-999999px';
	document.body.appendChild(textArea);
	textArea.focus();
	textArea.select();

	try {
		document.execCommand('copy');
	} finally {
		document.body.removeChild(textArea);
	}
}

/**
 * Умная функция шаринга с автоматическим fallback
 * @param {Object} options - Опции для шаринга
 * @param {string} [options.title] - Заголовок
 * @param {string} [options.text] - Текст для шаринга
 * @param {string} [options.url] - URL для шаринга
 * @param {File[]} [options.files] - Массив файлов для шаринга
 * @param {boolean} [options.fallbackToClipboard=true] - Использовать fallback на копирование в буфер обмена
 * @returns {Promise<void>}
 */
export async function shareSmart({
	title,
	text,
	url,
	files,
	fallbackToClipboard = true,
}) {
	try {
		if (files && files.length > 0) {
			await shareFiles({ title, text, files });
		} else {
			await shareText({ title, text, url });
		}
	} catch (error) {
		// Если Web Share API не поддерживается и включен fallback
		if (fallbackToClipboard && !canShare()) {
			await shareFallback({ text, url });
		} else {
			throw error;
		}
	}
}
