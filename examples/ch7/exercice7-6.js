function applyArraysDiffSequence(oldArray, diffSeq) {
	return diffSeq.reduce((array, { op, item, index, from }) => {
		switch (op) {
			case ARRAY_DIFF_OP.ADD:
				array.splice(index, 0, item);
				break;
			case ARRAY_DIFF_OP.REMOVE:
				array.splice(index, 1);
				break;
			case ARRAY_DIFF_OP.MOVE:
				array.splice(from, 0, array.splice(from, 1)[0]);
			case ARRAY_DIFF_OP.NOOP:
				return array;
		}

		return array;
	}, oldArray);
}

const oldArray = ['A', 'A', 'B', 'C'];
const newArray = ['C', 'K', 'A', 'B'];

const sequence = arraysDiffSequence(oldArray, newArray);

[
	{ op: 'move', originalIndex: 3, from: 3, index: 0, item: 'C' },
	{ op: 'add', index: 1, item: 'K' },
	{ op: 'noop', index: 2, originalIndex: 0, item: 'A' },
	{ op: 'move', originalIndex: 2, from: 4, index: 3, item: 'B' },
	{ op: 'remove', index: 4, item: 'A' },
];
