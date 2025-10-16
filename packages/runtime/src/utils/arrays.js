export function withoutNulls(array) {
	return array
		.filter(element => element !== null)
		.filter(element => element !== undefined);
}
