/* exported error, Indicator */

const { GObject, St } = imports.gi

const Main = imports.ui.main
const PanelMenu = imports.ui.panelMenu
const PopupMenu = imports.ui.popupMenu
const Config = imports.misc.config

const ExtensionUtils = imports.misc.extensionUtils
const _ = ExtensionUtils.gettext

const Me = ExtensionUtils.getCurrentExtension()
const Globals = Me.imports.globals
const Log = Me.imports.log

function error(err) {
  Indicator.get().error(err)
}

var Indicator = GObject.registerClass(
  class Indicator extends PanelMenu.Button {
    static #instance

    static get() {
      if (!Indicator.#instance) {
        Indicator.#instance = new Indicator()
      }
      return Indicator.#instance
    }

    static dispose() {
      if (!Indicator.#instance) return
      Indicator.#instance.destroy()
      Indicator.#instance = null
    }

    icon
    status
    message
    sep
    prefs
    #error = false

    constructor() {
      super(0.0, Me.metadata.name)

      this.icon = new St.Icon({
        icon_name: 'face-uncertain-symbolic',
        style_class: 'system-status-icon qwb-indicator',
      })
      this.icon.set_style('color: orange;')
      this.add_child(this.icon)

      const status_text = _('%s is loading').format(Me.metadata.name)
      this.status = new PopupMenu.PopupImageMenuItem(status_text, 'content-loading-symbolic')
      this.status.set_style('font-weight: bold; color: orange;')
      this.menu.addMenuItem(this.status)

      const message_text = _("It's loading. If this continues, something\nmight be wrong.")
      this.message = new PopupMenu.PopupMenuItem(message_text)
      this.message.setOrnament(PopupMenu.Ornament.HIDDEN)
      this.menu.addMenuItem(this.message)

      this.sep = new PopupMenu.PopupSeparatorMenuItem()
      this.menu.addMenuItem(this.sep)

      this.prefs = new PopupMenu.PopupImageMenuItem('Preferences', 'preferences-system-symbolic')
      this.prefs.connectObject(
        'button-press-event',
        () => {
          ExtensionUtils.openPrefs()
        },
        this,
      )
      this.menu.addMenuItem(this.prefs)
    }

    ok() {
      if (this.#error) return
      this.icon.set_style('color: greenyellow;')
      this.icon.set_icon_name('face-smile-big-symbolic')
      this.status.label.text = _('%s is running').format(Me.metadata.name)
      this.status.setIcon('emblem-ok-symbolic')
      this.status.set_style('font-weight: bold; color: greenyellow;')
      this.message.label.text = _('No fatal errors found.')
    }

    error(err) {
      Log.error(err)
      this.#error = true

      this.icon.set_style('color: crimson;')
      this.icon.set_icon_name('face-sick-symbolic')

      this.status.label.text = _('ERROR: %s is BROKEN !!').format(Me.metadata.name)
      this.status.setIcon('dialog-error-symbolic')
      this.status.set_style('font-weight: bold; color: crimson;')

      this.message.label.text = err.message
      this.message.connectObject(
        'button-press-event',
        () => {
          St.Clipboard.get_default().set_text(St.ClipboardType.CLIPBOARD, err.message)
          Main.notify(
            _('Error details copied to clipboard'),
            _('The error details have been copied to the clipboard.'),
          )
        },
        this,
      )

      Globals.notify_fatal_error(err)
    }
  },
)
