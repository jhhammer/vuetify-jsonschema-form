export default {
  data() {
    return {
      editabledArrayProp: {
        currentDialog: null,
        editItem: null,
        editedItems: {}
      }
    }
  },
  computed: {
    isEditableArray() {
      if (this.fullSchema.type === 'array' && this.fullSchema.items && this.fullSchema.items.type === 'object') return true
    },
    readonlyItemSchema() {
      if (!this.fullSchema.items) return

      const schema = JSON.parse(JSON.stringify(this.fullSchema.items))
      schema.readOnly = true
      if (this.itemTitle) {
        if (schema.properties && schema.properties[this.itemTitle]) {
          schema.properties[this.itemTitle]['x-display'] = 'hidden'
        }
        if (schema.oneOf) {
          schema.oneOf.forEach((value) => {
            if (value.properties[this.itemTitle]) value.properties[this.itemTitle]['x-display'] = 'hidden'
          })
        }
        if (this.fullSchema.items.allOf) {
          schema.allOf.forEach((value) => {
            if (value.properties[this.itemTitle]) value.properties[this.itemTitle]['x-display'] = 'hidden'
          })
        }
      }
      return schema
    }
  },
  watch: {},
  methods: {
    renderArrayItemModal(h, item, i) {
      const isNew = i === -1
      let itemProperty
      if (this.editabledArrayProp.currentDialog === i) {
        if (!this.fullOptions.idPrefix.endsWith('--dialog--')) {
          this.fullOptions.idPrefix = this.fullOptions.idPrefix + '--dialog--'
        }
        itemProperty = h('v-jsf', {
          props: {
            schema: this.fullSchema.items,
            value: this.editabledArrayProp.editItem,
            modelRoot: this.modelRoot || this.value,
            modelKey: i,
            parentKey: `${this.fullKey}.`,
            options: this.fullOptions,
            sectionDepth: this.sectionDepth + 1,
            separateValidation: true
          },
          scopedSlots: this.childScopedSlots(this.fullSchema.key),
          on: {
            error: e => this.$emit('error', e),
            input: value => { this.editabledArrayProp.editItem = value }
          }
        }, this.childSlots(h, this.fullSchema.key))
      }

      const scopedSlots = { activator: () => h('v-btn', {
        on: { click: () => {
          this.editabledArrayProp.editItem = JSON.parse(JSON.stringify(item))
          this.editabledArrayProp.currentDialog = i
        } },
        attrs: { id: this.fullOptions.idPrefix + this.dashKey + '-' + (isNew ? '-add' : i + '--edit') + '-button' },
        class: { 'vjsf-array-add-button': true },
        props: { icon: !isNew, fab: isNew, small: isNew, color: 'primary' } }, [
        h('v-icon', isNew ? this.fullOptions.icons.add : this.fullOptions.icons.edit)
      ]) }
      const close = () => {
        itemProperty.componentInstance.resetValidation()
        this.editabledArrayProp.currentDialog = null
      }
      return h('v-dialog', { props: { ...this.fullOptions.dialogProps, value: this.editabledArrayProp.currentDialog === i, closeOnContentClick: false }, scopedSlots, on: { 'click:outside': close } }, [
        h('v-card', [
          h('v-card-title', this.itemTitle && item[this.itemTitle]),
          h('v-card-text', [itemProperty]),
          h('v-card-actions', [
            h('v-spacer'),
            h('v-btn', { props: { text: true },
              on: { click: close },
              attrs: { id: this.fullOptions.idPrefix + this.dashKey + '--dialog-cancel-button' },
              class: { 'vjsf-array-dialog-cancel-button': true }
            }, 'cancel'),
            h('v-btn', { props: { color: 'primary' },
              on: { click: () => {
                if (!itemProperty.componentInstance.validate(true)) return
                if (isNew) {
                  this.editabledArrayProp.editedItems[this.value.length] = true
                  this.value.push(this.editabledArrayProp.editItem)
                } else {
                  this.editabledArrayProp.editedItems[i] = true
                  this.$set(this.value, i, this.editabledArrayProp.editItem)
                  // reprocess schema / model in RO item, in case oneOf change for example
                  // this would not be necessary of everything was properly reactive
                  // TODO: rethink parts of reactivity
                  this.$nextTick(() => this.$refs['roItem-' + i].initFromSchema())
                }
                this.$emit('input', this.value)
                this.$emit('change', this.value)
                this.editabledArrayProp.currentDialog = null
              } },
              attrs: { id: this.fullOptions.idPrefix + this.dashKey + '--dialog-ok-button' },
              class: { 'vjsf-array-dialog-ok-button': true }
            }, 'ok')
          ])
        ])
      ])
    },
    renderArrayItemRO(h, item, i) {
      return h('v-jsf', {
        props: {
          schema: this.readonlyItemSchema,
          value: JSON.parse(JSON.stringify(item)),
          modelRoot: this.modelRoot || this.value,
          modelKey: i,
          parentKey: `${this.fullKey}.`,
          options: { ...this.fullOptions, hideReadOnly: false, fieldProps: { ...this.fullOptions.fieldProps, dense: true } },
          sectionDepth: this.sectionDepth + 1,
          separateValidation: true
        },
        ref: 'roItem-' + i,
        on: {
          input: (value) => {
            // even if it readOnly we listen to changes in order to fill default values in prefilled arrays
            if (!this.editabledArrayProp.editedItems[i]) this.$set(this.value, i, value)
          }
        }
      })
    },
    renderEditableArray(h) {
      if (!this.isEditableArray) return
      const headerChildren = [h('v-subheader', this.label)]
      if (!this.disabled && !this.fromUrl && !this.fullSchema.fromData) {
        headerChildren.push(this.renderArrayItemModal(h, this.fullSchema.items.default || this.defaultValue(this.fullSchema.items), -1))
      }
      const header = h('v-layout', { props: { row: true }, class: 'mt-2 mb-1 pr-1' }, headerChildren)

      let list
      if (this.value && this.value.length) {
        const listItems = this.value.filter(item => !!item).map((item, i) => h('v-flex', { props: { xs12: true } }, [
          h('v-card', { class: 'my-2', props: { tile: true } }, [
            h('v-card-actions', [
              (!this.disabled) && this.renderArrayItemModal(h, item, i),
              (!this.disabled && !this.fromUrl && !this.fullSchema.fromData) && h('v-btn', { props: { icon: true, color: 'normal' },
                attrs: { id: this.fullOptions.idPrefix + this.dashKey + '-' + i + '--delete-button' },
                class: { 'vjsf-array-delete-button': true },
                on: { click: () => {
                  const value = this.value.filter(i => i !== item)
                  this.$emit('input', value)
                  this.$emit('change', value)
                } } }, [h('v-icon', this.fullOptions.icons.delete)]),
                h('v-spacer')
            ]),
            h('v-card-title', { props: { primaryTitle: true } }, this.itemTitle && item[this.itemTitle]),
            h('v-card-text', { class: 'pb-0' }, [this.renderArrayItemRO(h, item, i)])
          ])
        ]))
        list = h('v-container', { props: { gridListMd: true }, class: 'pt-0 px-2 ' + this.fullOptions.objectContainerClass }, this.fullOptions.disableSorting ? listItems : [
          h('draggable', { props: { value: this.value },
            style: 'width: 100%;cursor: move;',
            on: { input: (value) => {
              this.$emit('input', value)
              this.$emit('change', value)
              this.$nextTick(() => {
                for (let i = 0; i < value.length; i++) {
                  // reprocess schema / model in RO item, in case oneOf change for example
                  // this would not be necessary of everything was properly reactive
                  // TODO: rethink parts of reactivity
                  this.$refs['roItem-' + i].initFromSchema()
                }
              })
            } } }, listItems)
        ])
      }

      return [header, list]
    }
  }
}
