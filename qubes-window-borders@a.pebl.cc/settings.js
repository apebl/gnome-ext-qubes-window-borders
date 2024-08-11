/* exported Settings */

const { GObject, Gio } = imports.gi

const ExtensionUtils = imports.misc.extensionUtils

const Me = ExtensionUtils.getCurrentExtension()
const Globals = Me.imports.globals
const Indicator = Me.imports.indicator

var Settings = GObject.registerClass(
  {
    Signals: {
      changed: {
        param_types: [GObject.TYPE_STRING],
      },
    },
  },
  class Settings extends GObject.Object {
    #native
    #changed_id

    constructor() {
      super()
      this.#native = ExtensionUtils.getSettings()
      this.#changed_id = this.#native.connect('changed', this.#changed.bind(this))
      this.#bind()
      this.fetch()
    }

    dispose() {
      this.#native.disconnect(this.#changed_id)
    }

    #bind() {
      const g = this.#native
      g.bind('border-width', Globals.border_style, 'width', Gio.SettingsBindFlags.DEFAULT)
      g.bind('border-padding', Globals.border_style, 'padding', Gio.SettingsBindFlags.DEFAULT)
      g.bind('border-opacity', Globals.border_style, 'opacity', Gio.SettingsBindFlags.DEFAULT)

      g.bind('label-enabled', Globals.label_style, 'enabled', Gio.SettingsBindFlags.DEFAULT)
      g.bind(
        'label-dom0-visible',
        Globals.label_style,
        'dom0-visible',
        Gio.SettingsBindFlags.DEFAULT,
      )
      g.bind(
        'label-dispvm-template',
        Globals.label_style,
        'dispvm-template',
        Gio.SettingsBindFlags.DEFAULT,
      )
      g.bind('label-opacity', Globals.label_style, 'opacity', Gio.SettingsBindFlags.DEFAULT)
      g.bind('label-position', Globals.label_style, 'position', Gio.SettingsBindFlags.DEFAULT)
      g.bind('label-alignment', Globals.label_style, 'alignment', Gio.SettingsBindFlags.DEFAULT)
      g.bind('label-offset', Globals.label_style, 'offset', Gio.SettingsBindFlags.DEFAULT)
      g.bind('label-inset', Globals.label_style, 'inset', Gio.SettingsBindFlags.DEFAULT)
      g.bind('label-vertical', Globals.label_style, 'vertical', Gio.SettingsBindFlags.DEFAULT)
    }

    fetch() {
      this.fetch_prop('colors')
      this.fetch_prop('wm-class-styles')
    }

    fetch_prop(key) {
      const g = this.#native
      switch (key) {
        case 'colors': {
          Globals.colors.reset()
          const colors = g.get_value(key).deep_unpack()
          for (const [key, val] of Object.entries(colors)) {
            if (!Globals.special_labels.includes(key)) continue
            Globals.colors.set_color(key, val)
          }
          break
        }
        case 'wm-class-styles': {
          Globals.wm_class_styles.length = 0
          const styles = g.get_value(key).deep_unpack()
          styles.forEach(([pattern, style]) => {
            const regex = new RegExp(pattern)
            Globals.wm_class_styles.push([regex, style])
          })
          break
        }
        default:
          break
      }
    }

    #changed(native, key) {
      try {
        this.fetch_prop(key)
        this.emit('changed', key)
      } catch (err) {
        Indicator.error(err)
      }
    }
  },
)
