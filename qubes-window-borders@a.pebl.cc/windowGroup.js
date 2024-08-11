/* exported WindowGroup */

const { Meta } = imports.gi

const Main = imports.ui.main
const ExtensionUtils = imports.misc.extensionUtils

const Me = ExtensionUtils.getCurrentExtension()
const Window = Me.imports.window
const Indicator = Me.imports.indicator

class WindowMap {
  by_id = new Map()
  by_actor = new Map()

  clear() {
    this.by_id.clear()
    this.by_actor.clear()
  }

  set(id, actor, window) {
    const item = new WindowMap.Item(id, actor, window)
    this.by_id.set(id, item)
    this.by_actor.set(actor, item)
  }

  delete_by_id(id) {
    const item = this.by_id.get(id)
    if (!item) return null
    this.by_id.delete(id)
    this.by_actor.delete(item.actor)
    return item
  }

  delete_by_actor(actor) {
    const item = this.by_actor.get(actor)
    if (!item) return null
    this.by_id.delete(item.id)
    this.by_actor.delete(actor)
    return item
  }

  static Item = class {
    id
    actor
    window

    constructor(id, actor, window) {
      this.id = id
      this.actor = actor
      this.window = window
    }
  }
}

var WindowGroup = class WindowGroup {
  windows = new WindowMap()

  #window_added_id
  #window_removed_id

  constructor() {
    this.#prepare_windows()

    this.#window_added_id = global.window_group.connect(
      'actor-added',
      this.#window_added.bind(this),
    )
    this.#window_removed_id = global.window_group.connect(
      'actor-removed',
      this.#window_removed.bind(this),
    )
  }

  dispose() {
    global.window_group.disconnect(this.#window_added_id)
    global.window_group.disconnect(this.#window_removed_id)

    for (const [_, item] of this.windows.by_id) {
      const window = item.window
      window.dispose()
      global.window_group.remove_child(window.decor)
    }
    this.windows.clear()
  }

  update_windows() {
    for (const [_, item] of this.windows.by_id) {
      item.window.update_decor()
    }
  }

  set_error() {
    for (const [_, item] of this.windows.by_id) {
      item.window.meta_wnd.vmname = '<!> ERROR <!>'
      item.window.meta_wnd.color_label = 'error'
      item.window.meta_wnd.vm_type = null
      item.window.meta_wnd.vm_template = null
      item.window.update_decor()
    }
  }

  #prepare_windows() {
    const meta_wg = global.window_group
    global.get_window_actors().forEach((actor) => {
      this.#window_added(meta_wg, actor)
    })
  }

  #window_added(meta_wg, actor) {
    try {
      if (!(actor instanceof Meta.WindowActor)) return
      const meta_win = actor.get_meta_window()
      if (!meta_win) return

      switch (meta_win.window_type) {
        case Meta.WindowType.NORMAL:
        case Meta.WindowType.DIALOG:
        case Meta.WindowType.MODAL_DIALOG:
          break
        default:
          return
      }

      const window = new Window.Window(actor)
      this.windows.set(window.meta_wnd.id, actor, window)
      meta_wg.add_child(window.decor)
      window.restack()
    } catch (err) {
      Indicator.error(err)
    }
  }

  #window_removed(meta_wg, actor) {
    try {
      const item = this.windows.delete_by_actor(actor)
      if (!item) return
      const window = item.window
      window.dispose()
      const parent = window.decor.get_parent()
      if (!parent) return
      parent.remove_child(window.decor)
    } catch (err) {
      Indicator.error(err)
    }
  }
}
