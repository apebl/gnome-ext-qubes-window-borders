/* exported Label */

const { GObject, St, Clutter } = imports.gi

const ExtensionUtils = imports.misc.extensionUtils

const Me = ExtensionUtils.getCurrentExtension()
const Globals = Me.imports.globals

var Label = GObject.registerClass(
  class Label extends St.Label {
    #addx = 0
    #addy = 0

    constructor() {
      super({ style_class: 'qwb-label' })
    }

    update(rect, label_text, color_label) {
      if (color_label === 'dom0' && !Globals.label_style.dom0_visible) {
        if (this.visible) {
          this.hide()
        }
        return
      }
      if (color_label === 'pending' && !Globals.label_style.pending_visible) {
        if (this.visible) {
          this.hide()
        }
        return
      }
      if (!this.visible) {
        this.show()
      }

      this.opacity = Globals.label_style.opacity_int

      const text = this.#format_text(label_text)
      const color = Globals.colors[color_label]
      if (!color) {
        throw new Error(`Invalid color label: ${color_label}`)
      }
      const text_color = this.#text_color(color)

      this.set_text(text)
      this.set_style(`background-color: ${color}; color: ${text_color};`)

      const align = Globals.label_style.alignment
      switch (align) {
        case 'start':
        case 'center':
        case 'end':
          break
        default:
          throw new Error(`Invalid label align: ${align}`)
      }

      const vert = Globals.label_style.vertical
      switch (vert) {
        case 'none':
        case 'stacked':
        case 'rotated-cw':
        case 'rotated-ccw':
          break
        default:
          throw new Error(`Invalid vertical option: ${vert}`)
      }

      const pos = Globals.label_style.position
      this.#set_style_classes(pos, align, vert)
      this.#set_text_rotation()
      switch (pos) {
        case 'top':
          this.#update_top(rect)
          break
        case 'bottom':
          this.#update_bottom(rect)
          break
        case 'left':
          this.#update_left(rect)
          break
        case 'right':
          this.#update_right(rect)
          break
        default:
          throw new Error(`Invalid label position: ${pos}`)
      }
    }

    #update_top(rect) {
      const align = Globals.label_style.alignment
      const offset = Globals.label_style.offset
      const inset = Globals.label_style.inset

      const size = this.#get_formatted_size()
      const inset_pos = inset * size.height - size.height

      if (align === 'start') {
        this.set_position(offset, inset_pos)
      } else if (align === 'center') {
        this.set_position(rect.width * 0.5 - size.width * 0.5 + offset, inset_pos)
      } else {
        this.set_position(rect.width - size.width - offset, inset_pos)
      }
    }

    #update_bottom(rect) {
      const align = Globals.label_style.alignment
      const offset = Globals.label_style.offset
      const inset = Globals.label_style.inset

      const size = this.#get_formatted_size()
      const inset_pos = -inset * size.height

      if (align === 'start') {
        this.set_position(offset, rect.height + inset_pos)
      } else if (align === 'center') {
        this.set_position(rect.width * 0.5 - size.width * 0.5 + offset, rect.height + inset_pos)
      } else {
        this.set_position(rect.width - size.width - offset, rect.height + inset_pos)
      }
    }

    #update_left(rect) {
      const align = Globals.label_style.alignment
      const offset = Globals.label_style.offset
      const inset = Globals.label_style.inset

      const size = this.#get_formatted_size()
      const inset_pos = inset * size.width - size.width

      if (align === 'start') {
        this.set_position(inset_pos + this.#addx, offset + this.#addy)
      } else if (align === 'center') {
        this.set_position(
          inset_pos + this.#addx,
          rect.height * 0.5 - size.height * 0.5 + offset + this.#addy,
        )
      } else {
        this.set_position(inset_pos + this.#addx, rect.height - size.height - offset + this.#addy)
      }
    }

    #update_right(rect) {
      const align = Globals.label_style.alignment
      const offset = Globals.label_style.offset
      const inset = Globals.label_style.inset

      const size = this.#get_formatted_size()
      const inset_pos = -inset * size.width

      if (align === 'start') {
        this.set_position(rect.width + inset_pos + this.#addx, offset + this.#addy)
      } else if (align === 'center') {
        this.set_position(
          rect.width + inset_pos + this.#addx,
          rect.height * 0.5 - size.height * 0.5 + offset + this.#addy,
        )
      } else {
        this.set_position(
          rect.width + inset_pos + this.#addx,
          rect.height - size.height - offset + this.#addy,
        )
      }
    }

    #set_style_classes(pos, align, vert) {
      const pos_cls = `pos-${pos}`
      const align_cls = `align-${align}`
      let vert_cls = ''
      if (pos === 'left' || pos === 'right') {
        vert_cls = `vert-${vert}`
      }
      if (
        this.has_style_class_name(pos_cls) &&
        this.has_style_class_name(align_cls) &&
        vert_cls &&
        this.has_style_class_name(vert_cls)
      ) {
        return
      }
      this.set_style_class_name(`qwb-label ${pos_cls} ${align_cls} ${vert_cls}`)
    }

    #format_text(text) {
      const pos = Globals.label_style.position
      if ((pos === 'left' || pos === 'right') && Globals.label_style.vertical === 'stacked') {
        return text.split('').join('\n')
      }
      return text
    }

    #text_color(bg_color) {
      if (bg_color === 'transparent') {
        return '#000000'
      }
      const [r, g, b] = this.#hex2rgb(bg_color)
      const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      return l > 0.5 ? '#000000' : '#ffffff'
    }

    #hex2rgb(hex) {
      const r = Number.parseInt(hex.slice(1, 3), 16)
      const g = Number.parseInt(hex.slice(3, 5), 16)
      const b = Number.parseInt(hex.slice(5, 7), 16)
      return [r, g, b]
    }

    #set_text_rotation() {
      const pos = Globals.label_style.position
      switch (pos) {
        case 'top':
          this.set_rotation_angle(Clutter.RotateAxis.Z_AXIS, 0)
          break
        case 'bottom':
          this.set_rotation_angle(Clutter.RotateAxis.Z_AXIS, 0)
          break
        case 'left':
        case 'right':
          switch (Globals.label_style.vertical) {
            case 'rotated-cw':
              this.#addx = this.height
              this.#addy = 0
              this.set_rotation_angle(Clutter.RotateAxis.Z_AXIS, 90)
              break
            case 'rotated-ccw':
              this.#addx = 0
              this.#addy = this.width
              this.set_rotation_angle(Clutter.RotateAxis.Z_AXIS, -90)
              break
            default:
              this.#addx = 0
              this.#addy = 0
              this.set_rotation_angle(Clutter.RotateAxis.Z_AXIS, 0)
          }
          break
        default:
          throw new Error(`Invalid label position: ${pos}`)
      }
    }

    #get_formatted_size() {
      const size = this.size
      const pos = Globals.label_style.position
      if (
        (pos === 'left' || pos === 'right') &&
        Globals.label_style.vertical.startsWith('rotated')
      ) {
        const temp = size.width
        size.width = size.height
        size.height = temp
      }
      return size
    }
  },
)
