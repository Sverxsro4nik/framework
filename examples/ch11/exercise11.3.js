const SearchField = defineComponent({
	render() {
		return h('input', {
			type: 'text',
			value: this.props.value,
			oninput: (e) => this.emit('input', e.target.value),
		});
	},
});
