/* exported init */

const { GLib, Gio, Meta } = imports.gi

const Main = imports.ui.main
const ExtensionUtils = imports.misc.extensionUtils

const Me = ExtensionUtils.getCurrentExtension()
const Indicator = Me.imports.indicator
const WindowGroup = Me.imports.windowGroup
const WindowPreviewGroup = Me.imports.windowPreviewGroup
const Globals = Me.imports.globals
const Settings = Me.imports.settings
const Log = Me.imports.log
const Cmd = Me.imports.cmd

class Extension {
  #settings
  #window_group
  #changed_id = 0
  #timeout_id = 0

  #cancellable

  constructor() {
    ExtensionUtils.initTranslations()
  }

  enable() {
    try {
      const indicator = Indicator.Indicator.init()
      Main.panel.addToStatusArea(Me.metadata.uuid, indicator)
    } catch (err) {
      Log.error(err)
    }

    try {
      this.#settings = new Settings.Settings()

      this.#window_group = new WindowGroup.WindowGroup()
      WindowPreviewGroup.WindowPreviewGroup.setup(this.#window_group)

      Globals.fatal_error_cb = (err) => {
        const wg = this.#window_group
        if (wg) wg.set_error()
      }

      this.#changed_id = this.#settings.connect('changed', this.#settings_changed.bind(this))

      this.#load().catch((err) => {
        if (err instanceof Cmd.TryCancelledError) return
        Indicator.error(err)
      })
    } catch (err) {
      Indicator.error(err)
    }
  }

  #settings_changed(settings, key) {
    try {
      if (this.#timeout_id > 0) GLib.Source.remove(this.#timeout_id)
      if (!this.#window_group) return
      this.#timeout_id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, () => {
        try {
          this.#window_group.update_windows()
          this.#timeout_id = 0
          return GLib.SOURCE_REMOVE
        } catch (err) {
          Indicator.error(err)
        }
      })
    } catch (err) {
      Indicator.error(err)
    }
  }

  async #load() {
    this.#cancellable = new Gio.Cancellable()

    await Cmd.load_color_labels(this.#cancellable)
    Globals.colors_ready = true

    const cancellable = this.#cancellable
    if (!cancellable || cancellable.is_cancelled()) return
    this.#cancellable = null

    Indicator.Indicator.get().ok()
  }

  disable() {
    try {
      this.#cancellable?.cancel()
      this.#cancellable = null

      if (this.#changed_id > 0) {
        this.#settings.disconnect(this.#changed_id)
        this.#changed_id = 0
      }
      this.#settings?.dispose()
      this.#settings = null

      if (this.#timeout_id > 0) {
        GLib.Source.remove(this.#timeout_id)
        this.#timeout_id = 0
      }

      Globals.fatal_error_cb = null
      WindowPreviewGroup.WindowPreviewGroup.dispose()
      this.#window_group?.dispose()
      this.#window_group = null

      Indicator.Indicator.dispose()
      Globals.reset()
    } catch (err) {
      Log.error(err)
    }
  }
}

function init() {
  return new Extension()
}
