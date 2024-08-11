/* exported Decor */

const { GObject, St } = imports.gi

const ExtensionUtils = imports.misc.extensionUtils

const Me = ExtensionUtils.getCurrentExtension()
const Globals = Me.imports.globals
const Label = Me.imports.label

var Decor = GObject.registerClass(
  class Decor extends St.Widget {
    #border
    #label

    #styles = new Set()

    constructor(meta_win) {
      super({ style_class: 'qwb-decor' })
      this.#border = new St.Bin({ style_class: 'qwb-border' })
      this.#label = new Label.Label()
      this.add_child(this.#border)
      this.add_child(this.#label)
    }

    update(rect, label_text, color_label) {
      const color = Globals.colors[color_label]
      if (!color) new Error(`Invalid color label: ${color_label}`)
      this.set_position(rect.x, rect.y)
      this.#update_border(rect, color)
      if (!Globals.label_style.enabled) {
        if (this.#label.visible) {
          this.#label.hide()
        }
        return
      }
      if (!this.#label.visible) {
        this.#label.show()
      }
      this.#label.update(rect, label_text, color_label)
    }

    #update_border(rect, color) {
      this.#border.opacity = Globals.border_style.opacity_int

      const width = Globals.border_style.width
      const pad = Globals.border_style.padding

      this.#border.set_position(-pad, -pad)
      this.#border.set_size(rect.width + pad * 2, rect.height + pad * 2)
      this.#border.set_style(`border-width: ${width}px; border-color: ${color};`)
    }

    update_style_classes(new_styles) {
      const old_styles = new Set(this.#styles)
      this.#set_union(this.#styles, new_styles)
      if (old_styles.size !== this.#styles.size) {
        const removed = this.#set_diff(old_styles, this.#styles)
        for (const name of removed) {
          this.remove_style_class_name(name)
        }
        const added = this.#set_diff(this.#styles, old_styles)
        for (const name of added) {
          this.add_style_class_name(name)
        }
      }
    }

    #set_union(set, set2) {
      for (const val of set2) {
        set.add(val)
      }
    }

    #set_diff(set, set2) {
      const newset = new Set(set)
      for (const val of set2) {
        newset.delete(val)
      }
      return newset
    }
  },
)
