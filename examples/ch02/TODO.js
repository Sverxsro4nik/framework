// App state
const TODO = ['Walk the dog', 'Water the plants', 'Sand the chairs'];

// Link for HTML elements
const addTodoInput = document.getElementById('todo-input');
const addTodoButton = document.getElementById('add-todo-btn');
const TODOList = document.getElementById('TODO-list');

// View initialisation

for (const todo of TODO) {
	TODOList.appendChild(renderTodoInReadMode(todo));
}

addTodoInput.addEventListener('input', () => {
	addTodoButton.disabled = addTodoInput.value.trim().length < 3;
});

addTodoInput.addEventListener('keydown', event => {
	if (event.key === 'Enter' && addTodoInput.value.trim().length >= 3) {
		addTodo();
	}
});

addTodoButton.addEventListener('click', () => {
	addTodo();
});

function renderTodoInReadMode(todo) {
	const li = document.createElement('li');

	const span = document.createElement('span');
	span.textContent = todo;
	span.addEventListener('dblclick', () => {
		const index = TODO.indexOf(todo);
		TODOList.replaceChild(renderTodoInEditMode(todo), TODOList.children[index]);
	});

	li.appendChild(span);

	const button = document.createElement('button');
	button.textContent = 'Done';

	button.addEventListener('click', () => {
		const index = TODO.indexOf(todo);
		removeTodo(index);
	});

	li.appendChild(button);

	return li;
}

function renderTodoInEditMode(todo) {
	const li = document.createElement('li');

	const input = document.createElement('input');
	input.type = 'text';
	input.value = todo;
	li.appendChild(input);

	const saveButton = document.createElement('button');
	saveButton.textContent = 'Save';
	saveButton.addEventListener('click', () => {
		const index = TODO.indexOf(todo);
		updateTodo(index, input.value);
	});

	li.appendChild(saveButton);

	const cancelButton = document.createElement('button');
	cancelButton.textContent = 'Cancel';
	cancelButton.addEventListener('click', () => {
		const index = TODO.indexOf(todo);
		TODOList.replaceChild(renderTodoInReadMode(todo), TODOList.children[index]);
	});

	li.appendChild(cancelButton);

	return li;
}

function addTodo() {
	const description = addTodoInput.value.trim();
	if (TODO.includes(description)) {
		alert('TODO already exists');
		return;
	}
	TODO.push(description);
	const todo = renderTodoInReadMode(description);
	TODOList.appendChild(todo);
	addTodoInput.value = '';
	speak(description);
	addTodoButton.disabled = true;
}

function removeTodo(index) {
	TODO.splice(index, 1);
	const element = TODOList.children[index];
	const span = element.querySelector('span');
	span.style.textDecoration = 'line-through';
}

function updateTodo(index, todo) {
	TODO[index] = todo;
	const element = renderTodoInReadMode(todo);
	TODOList.replaceChild(element, TODOList.children[index]);
}

const synth = window.speechSynthesis;

function speak(value) {
	if (synth.speaking) {
		console.error('speechSynthesis.speaking');
		synth.cancel();
		setTimeout(speak, 300);
	} else if (value !== '') {
		const utterThis = new SpeechSynthesisUtterance(value);
		utterThis.onend = function (event) {
			console.log('SpeechSynthesisUtterance.onend');
		};

		utterThis.onerror = function (event) {
			console.error('SpeechSynthesisUtterance.onerror');
		};
		utterThis.voice = synth.getVoices()[0];
		utterThis.onpause = function (event) {
			const char = event.utterance.text.charAt(event.charIndex);
			console.log(
				'Speech paused at character ' +
					event.charIndex +
					' of "' +
					event.utterance.text +
					'", which is "' +
					char +
					'".'
			);
		};

		utterThis.pitch = 10;
		utterThis.rate = 1;
		synth.speak(utterThis);
	}
}
