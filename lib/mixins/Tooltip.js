export default {
  data() {
    return {
      tooltip: {
        show: false,
        maxWidth: 200
      }
    }
  },
  mounted() {
    if (!this.htmlDescription) return
    if (this.$el && this.$el.getBoundingClientRect) this.tooltip.maxWidth = this.$el.getBoundingClientRect().left - 80
  },
  methods: {
    renderTooltip(h, slot) {
      if (!this.htmlDescription) return
      if (this.fullOptions.hideTooltips) return
      return h('v-tooltip', {
        slot,
        props: { value: this.tooltip.show, left: true, openOnHover: false, openOnClick: false, contentClass: 'vjsf-tooltip', ...this.fullSchema['x-props'] },
        scopedSlots: {
          activator: ({ on, attrs }) => h('v-btn', {
            on: on, // { click: () => { this.tooltip.show = !this.tooltip.show } },
            attrs: attrs,
            props: { icon: true },
            style: 'pointer-events: auto' // necessary or the tooltip is disabled on readOnly props
          }, [h('v-icon', { }, this.fullOptions.icons.info)])
        }
      }, [
        h('div', { style: `max-width: ${this.tooltip.maxWidth}px`, domProps: { innerHTML: this.htmlDescription } })
      ])
    }
  }
}
