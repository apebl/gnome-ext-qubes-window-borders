/* exported Window */

const ExtensionUtils = imports.misc.extensionUtils

const Me = ExtensionUtils.getCurrentExtension()
const Globals = Me.imports.globals
const MetaWnd = Me.imports.metaWnd
const Decor = Me.imports.decor
const Indicator = Me.imports.indicator

var Window = class Window {
  meta_wnd
  decor

  #size_changed_id
  #position_changed_id
  #restacked_id

  constructor(actor) {
    this.meta_wnd = new MetaWnd.MetaWnd(actor)
    this.decor = new Decor.Decor()
    this.update_decor()
    this.#fetch_props().catch((err) => Indicator.error(err))

    this.#size_changed_id = this.meta_wnd.meta_win.connect(
      'size-changed',
      this.update_decor.bind(this),
    )
    this.#position_changed_id = this.meta_wnd.meta_win.connect(
      'position-changed',
      this.update_decor.bind(this),
    )
    this.#restacked_id = global.display.connect('restacked', this.#restacked.bind(this))
  }

  dispose() {
    global.display.disconnect(this.#restacked_id)
    this.meta_wnd.meta_win.disconnect(this.#size_changed_id)
    this.meta_wnd.meta_win.disconnect(this.#position_changed_id)
    this.meta_wnd.dispose()
  }

  async #fetch_props() {
    await this.meta_wnd.fetch_props()
    this.update_decor()
  }

  #restacked(meta_disp) {
    try {
      this.restack()
      this.update_decor()
    } catch (err) {
      Indicator.error(err)
    }
  }

  restack() {
    const actor = this.meta_wnd.meta_win.get_compositor_private()
    const wg = global.window_group
    if (actor && wg && this.decor.get_parent() === wg && actor.get_parent() === wg) {
      wg.set_child_above_sibling(this.decor, actor)
    }
  }

  update_decor() {
    try {
      if (!this.#should_show()) {
        if (this.decor.visible) {
          this.decor.hide()
        }
        return
      }
      if (!this.decor.visible) {
        this.decor.show()
      }

      this.#update_styles()

      const rect = this.meta_wnd.meta_win.get_frame_rect()
      let label_text
      if (this.meta_wnd.vm_type === 'DispVM' && Globals.label_style.dispvm_template) {
        label_text = `${this.meta_wnd.vmname} (${this.meta_wnd.vm_template})`
      } else {
        label_text = this.meta_wnd.vmname
      }
      this.decor.update(rect, label_text, this.meta_wnd.color_label)
    } catch (err) {
      Indicator.error(err)
    }
  }

  #should_show() {
    const ws_manager = global.display.get_workspace_manager()
    const active_ws = ws_manager.get_active_workspace()
    return (
      this.meta_wnd.meta_win.showing_on_its_workspace() &&
      this.meta_wnd.meta_win.located_on_workspace(active_ws)
    )
  }

  #update_styles() {
    const styles = new Set()
    for (const name of this.meta_wnd.wm_class) {
      Globals.get_styles_for_wm_class(name, styles)
    }
    this.decor.update_style_classes(styles)
  }
}
