const NameComponent = defineComponent({
	onMounted() {
		console.log('Component mounted with name:', this.props.name);
	},

	render() {
		return h('p', {}, [hString(this.props.name)]);
	},
});

const App = defineComponent({
	render() {
		return hFragment([
			h(NameComponent, { name: 'Alice' }),
			h(NameComponent, { name: 'Bob' }),
			h(NameComponent, { name: 'Charlie' }),
			h(NameComponent, { name: 'Diana' }),
			h(NameComponent, { name: 'Eve' }),
		]);
	},
});
