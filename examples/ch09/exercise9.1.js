defineComponent({
	render() {
		return h("div", {}, [
			h("h1", {}, ["Important news!"]),
			h("p", {}, ["I made myself coffee"]),
			h("button", { onClick: () => alert("Good for you!") }, [
				"Say congrats!",
			]),
		]);
	},
});
