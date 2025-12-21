const MyCounter = defineComponent({
  state() {
    return { count: 1 }
  },

  render() {
    const { count } = this.state

    return h('div', { style: { 'padding-left': '2em' } }, [
      h(
        'button',
        {
          on: { click: () => this.updateState({ count: count + 1 }) },
        },
        [hString(count)],
      ),
      h('span', {}, [' — ']),
      h(
        'button',
        {
          on: { click: () => this.emit('remove') },
        },
        ['Remove'],
      ),
    ])
  },
})


const App = defineComponent({
  state() {
    return {
      counters: 3,
    }
  },

  render() {
    const { counters } = this.state

    return hFragment([
      h('h1', {}, ['Index as key problem']),
      h('p', {}, [
        'Set a different count in each counter, then remove the middle one.',
      ]),
      h(
        'div',
        {},
        Array(counters)
          .fill()
          .map((_, index) => {
            return h(MyCounter, {
              key: index,
              on: {
                remove: () => {
                  this.updateState({ counters: counters - 1 })
                },
              },
            })
          }),
      ),
    ])
  },
})
