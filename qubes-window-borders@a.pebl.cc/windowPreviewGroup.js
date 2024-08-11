/* exported WindowPreviewGroup */

const Workspace = imports.ui.workspace
const ExtensionUtils = imports.misc.extensionUtils

const Me = ExtensionUtils.getCurrentExtension()
const WindowPreview = Me.imports.windowPreview
const Indicator = Me.imports.indicator
const Cmd = Me.imports.cmd

var WindowPreviewGroup = class WindowPreviewGroup {
  static previews = new Map()
  static #func_backup = new Map()
  static #window_group

  static setup(window_group) {
    WindowPreviewGroup.#window_group = window_group
    WindowPreviewGroup.#func_backup.set(
      '_addWindowClone',
      Workspace.Workspace.prototype._addWindowClone,
    )
    WindowPreviewGroup.#func_backup.set(
      '_removeWindowClone',
      Workspace.Workspace.prototype._removeWindowClone,
    )

    Workspace.Workspace.prototype._addWindowClone = function (meta_win) {
      try {
        const oldfunc = WindowPreviewGroup.#func_backup.get('_addWindowClone')
        const gnome_win_preview = oldfunc.call(this, meta_win)

        const id = Cmd.get_window_id(meta_win)
        const item = WindowPreviewGroup.#window_group.windows.by_id.get(id)
        if (!item) return gnome_win_preview

        const window = item.window
        const preview = new WindowPreview.WindowPreview(gnome_win_preview, window)
        gnome_win_preview.insert_child_at_index(preview.decor, 1)
        WindowPreviewGroup.previews.set(id, preview)
        return gnome_win_preview
      } catch (err) {
        Indicator.error(err)
      }
    }

    Workspace.Workspace.prototype._removeWindowClone = function (meta_win) {
      try {
        const oldfunc = WindowPreviewGroup.#func_backup.get('_removeWindowClone')
        const id = Cmd.get_window_id(meta_win)
        const preview = WindowPreviewGroup.previews.get(id)
        if (!preview) return oldfunc.call(this, meta_win)
        WindowPreviewGroup.previews.delete(id)
        preview.dispose()
        preview.native.remove_child(preview.decor)
        return oldfunc.call(this, meta_win)
      } catch (err) {
        Indicator.error(err)
      }
    }
  }

  static dispose() {
    if (!WindowPreviewGroup.#window_group) return

    for (const [name, func] of WindowPreviewGroup.#func_backup) {
      Workspace.Workspace.prototype[name] = func
    }
    WindowPreviewGroup.#func_backup.clear()

    for (const [_, preview] of WindowPreviewGroup.previews) {
      preview.dispose()
      preview.native.remove_child(preview.decor)
    }
    WindowPreviewGroup.previews.clear()

    WindowPreviewGroup.#window_group = null
  }
}
