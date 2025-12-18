import { h, hText } from "../../packages/runtime/src/h";

const items = ["Item 1", "Item 2", "Item 3"];

const list = h("li", { key: index }, [hText(item)]);

h({
	tag: "ul",
	props: { list: items },
	type: "component",
	children: [items.map((item, index) => list(item, index))],
});

const List = defineComponent({
	render() {
		const { items } = this.props;
		return h(
			"ul",
			{},
			items.map((todo) => h(ListItem, { todo })),
		);
	},
});

const ListItem = defineComponent({
	render() {
		const { todo } = this.props;
		return h("li", {}, [todo]);
	},
});
