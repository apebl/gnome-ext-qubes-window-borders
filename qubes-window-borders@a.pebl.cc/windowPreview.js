/* exported WindowPreview */

const { Clutter } = imports.gi

const ExtensionUtils = imports.misc.extensionUtils

const Me = ExtensionUtils.getCurrentExtension()
const Globals = Me.imports.globals
const MetaWnd = Me.imports.metaWnd
const Decor = Me.imports.decor
const Indicator = Me.imports.indicator

var WindowPreview = class WindowPreview {
  native
  window
  decor

  #size_changed_id
  #scale_changed_id

  constructor(gnome_win_preview, window) {
    this.native = gnome_win_preview
    this.window = window

    this.decor = Clutter.Clone.new(window.decor)
    this.decor.set_pivot_point(0.5, 0.5)
    this.#update_scale()
    this.#update_decor()

    this.#size_changed_id = this.native.window_container.connect(
      'notify::width',
      this.#update_decor.bind(this),
    )
    this.#scale_changed_id = this.native.window_container.connect(
      'notify::scale-x',
      this.#update_scale.bind(this),
    )
  }

  dispose() {
    const container = this.native.window_container
    if (!container) return
    container.disconnect(this.#size_changed_id)
    container.disconnect(this.#scale_changed_id)
  }

  #update_decor() {
    try {
      const container = this.native.window_container
      this.decor.set_size(container.width, container.height)
    } catch (err) {
      Indicator.error(err)
    }
  }

  #update_scale() {
    try {
      const scale = this.native.window_container.scale_x
      this.decor.set_scale(scale, scale)
    } catch (err) {
      Indicator.error(err)
    }
  }
}
