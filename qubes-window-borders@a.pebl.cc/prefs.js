const { GObject, GLib, Adw, Gtk, Gio, Gdk } = imports.gi

const ExtensionUtils = imports.misc.extensionUtils
const _ = ExtensionUtils.gettext

const Me = ExtensionUtils.getCurrentExtension()
const Globals = Me.imports.globals
const Cmd = Me.imports.cmd

const SpinRow = GObject.registerClass(
  {
    Properties: {
      value: GObject.ParamSpec.double(
        'value',
        'Value',
        '',
        GObject.ParamFlags.READWRITE,
        Number.MIN_SAFE_INTEGER,
        Number.MAX_SAFE_INTEGER,
        0,
      ),
    },
  },
  class SpinRow extends Adw.ActionRow {
    spin

    constructor(props = {}) {
      super(props)
      this.spin = new Gtk.SpinButton({
        valign: Gtk.Align.CENTER,
        adjustment: new Gtk.Adjustment({
          lower: Number.MIN_SAFE_INTEGER,
          upper: Number.MAX_SAFE_INTEGER,
          step_increment: 0.1,
        }),
      })
      this.add_suffix(this.spin)
      this.set_activatable_widget(this.spin)
      this.spin.set_digits(2)
      this.bind_property(
        'value',
        this.spin,
        'value',
        GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE,
      )
    }
  },
)

const SwitchRow = GObject.registerClass(
  {
    Properties: {
      active: GObject.ParamSpec.boolean(
        'active',
        'Active',
        '',
        GObject.ParamFlags.READWRITE,
        false,
      ),
    },
  },
  class SwitchRow extends Adw.ActionRow {
    switch

    constructor(props = {}) {
      super(props)
      this.switch = new Gtk.Switch({ valign: Gtk.Align.CENTER })
      this.add_suffix(this.switch)
      this.set_activatable_widget(this.switch)
      this.bind_property(
        'active',
        this.switch,
        'active',
        GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE,
      )
    }
  },
)

const ScaleRow = GObject.registerClass(
  {
    Properties: {
      value: GObject.ParamSpec.double('value', 'Value', '', GObject.ParamFlags.READWRITE, 0, 1, 1),
    },
  },
  class ScaleRow extends Adw.ActionRow {
    scale

    constructor(props = {}) {
      super(props)
      this.scale = new Gtk.Scale({
        hexpand: true,
        draw_value: true,
        digits: 2,
        adjustment: new Gtk.Adjustment({
          lower: 0,
          upper: 1,
          step_increment: 0.1,
        }),
      })
      this.add_suffix(this.scale)
      this.set_activatable_widget(this.scale)
      this.bind_property(
        'value',
        this.scale.adjustment,
        'value',
        GObject.BindingFlags.BIDIRECTIONAL | GObject.BindingFlags.SYNC_CREATE,
      )
    }
  },
)

const ColorRow = GObject.registerClass(
  {
    Properties: {
      color: GObject.ParamSpec.string(
        'color',
        'Color',
        '#xxxxxx or transparent',
        GObject.ParamFlags.READWRITE,
        '#000000',
      ),
    },
  },
  class ColorRow extends Adw.ActionRow {
    transparent_allowed
    change_allowed
    color_label
    box
    switch
    color_button

    constructor(transparent_allowed, change_allowed, props = {}) {
      super(props)
      this.transparent_allowed = transparent_allowed
      this.change_allowed = change_allowed

      this.box = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        hexpand: true,
        valign: Gtk.Align.CENTER,
        halign: Gtk.Align.END,
        spacing: 12,
      })
      this.add_suffix(this.box)
      this.set_activatable_widget(this.box)

      if (this.transparent_allowed) {
        this.switch = new Gtk.Switch({
          halign: Gtk.Align.END,
          valign: Gtk.Align.CENTER,
        })
        this.box.append(this.switch)
      }

      this.color_button = new Gtk.ColorButton({
        halign: Gtk.Align.END,
        use_alpha: false,
      })
      this.box.append(this.color_button)

      if (this.transparent_allowed) {
        const binding_flags = GObject.BindingFlags.DEFAULT | GObject.BindingFlags.SYNC_CREATE
        this.switch.bind_property('active', this.color_button, 'sensitive', binding_flags)
        this.switch.connect('notify::active', () => {
          if (this.switch.active) {
            this.color = this.#get_color_hex()
          } else {
            this.color = 'transparent'
          }
        })
      }

      this.color_button.connect('notify::rgba', () => {
        this.color = this.#get_color_hex()
      })

      this.connect('notify::color', () => {
        if (this.color === 'transparent') {
          if (this.transparent_allowed) this.switch.active = false
        } else {
          const rgba = new Gdk.RGBA()
          rgba.parse(this.color)
          this.color_button.rgba = rgba
          if (this.transparent_allowed) this.switch.active = true
        }
      })

      if (!change_allowed) {
        this.color_button.can_focus = false
        this.color_button.can_target = false
      }
    }

    #get_color_hex() {
      const rgb = this.color_button.rgba
      return `#${this.#float2hex(rgb.red)}${this.#float2hex(rgb.green)}${this.#float2hex(rgb.blue)}`
    }

    #float2hex(val) {
      const int = Math.trunc(val * 255)
      const hex = int.toString(16)
      return hex.length === 1 ? `0${hex}` : hex
    }
  },
)

const VmLabelsRow = GObject.registerClass(
  {},
  class VmLabelsRow extends Adw.ExpanderRow {
    constructor(props = {}) {
      super(props)

      for (const pspec of Globals.colors.constructor.list_properties()) {
        const name = pspec.get_name()
        if (Globals.special_labels.includes(name)) continue
        const title = name.charAt(0).toUpperCase() + name.slice(1)
        const row = new ColorRow(false, false, { title: _(title) })
        row.color_label = name
        row.color = Globals.colors[name]
        this.add_row(row)
      }
    }
  },
)

const StyleGroup = GObject.registerClass(
  {
    Properties: {
      value: GObject.param_spec_variant(
        'value',
        'Value',
        '',
        new GLib.VariantType('a(ss)'),
        null,
        GObject.ParamFlags.READWRITE,
      ),
    },
  },
  class StyleGroup extends Adw.PreferencesGroup {
    box
    save_button
    add_button
    expander
    rows = []

    constructor(props = {}) {
      super(props)

      this.box = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        valign: Gtk.Align.CENTER,
        spacing: 12,
      })
      this.set_header_suffix(this.box)

      this.save_button = new Gtk.Button({
        icon_name: 'document-save-symbolic',
        valign: Gtk.Align.CENTER,
        sensitive: false,
      })
      this.box.append(this.save_button)

      this.add_button = new Gtk.Button({
        icon_name: 'list-add-symbolic',
        valign: Gtk.Align.CENTER,
      })
      this.box.append(this.add_button)

      this.expander = new Adw.ExpanderRow({
        title: _('Rules'),
      })
      this.add(this.expander)

      this.save_button.connect('clicked', () => {
        this.save_button.sensitive = false
        this.rows.forEach((row) => row.refreshed())
        this.notify('value')
      })
      this.add_button.connect('clicked', () => {
        this.add_row()
        this.expander.expanded = true
      })
    }

    add_row() {
      const row = new StyleRow()
      this.expander.add_row(row)
      this.rows.push(row)
      row.connect('removed', () => this.remove_row(row))
      row.connect('changed', () => {
        this.save_button.sensitive = true
      })
      return row
    }

    remove_row(row) {
      const idx = this.rows.indexOf(row)
      if (idx < 0) return
      this.expander.remove(row)
      this.rows.splice(idx, 1)
      this.save_button.sensitive = true
    }

    #clear() {
      this.rows.forEach((row) => this.expander.remove(row))
      this.rows.length = 0
    }

    get value() {
      const arr = []
      this.rows.forEach((row) => {
        const pattern = row.pattern.text.trim()
        const style = row.style.text.trim()
        if (!pattern || !style) return
        arr.push([pattern, style])
      })
      const variant = new GLib.Variant('a(ss)', arr)
      return variant
    }

    set value(val) {
      const cur = this.value
      if (cur.equal(val)) return
      const unpacked = val.deep_unpack()
      this.#clear()
      unpacked.forEach(([pattern, style]) => {
        const row = this.add_row()
        row.pattern.text = pattern
        row.style.text = style
        row.refreshed()
      })
      this.save_button.sensitive = false
      this.notify('value')
    }
  },
)

const StyleRow = GObject.registerClass(
  {
    Signals: {
      changed: {},
      removed: {},
    },
  },
  class StyleRow extends Adw.ActionRow {
    #settings
    box
    pattern
    style
    icon
    remove_button

    constructor(settings, props = {}) {
      super(props)

      this.box = new Gtk.Box({
        orientation: Gtk.Orientation.HORIZONTAL,
        hexpand: true,
        valign: Gtk.Align.CENTER,
        halign: Gtk.Align.FILL,
        spacing: 8,
      })
      this.add_prefix(this.box)
      this.set_activatable_widget(this.box)

      this.icon = new Gtk.Image({
        iconName: 'dialog-error-symbolic',
        opacity: 0.5,
      })
      this.box.append(this.icon)

      this.pattern = new Gtk.Entry({
        hexpand: true,
        halign: Gtk.Align.FILL,
        valign: Gtk.Align.CENTER,
        placeholder_text: 'WM_CLASS pattern',
      })
      this.box.append(this.pattern)

      this.style = new Gtk.Entry({
        hexpand: true,
        halign: Gtk.Align.FILL,
        valign: Gtk.Align.CENTER,
        placeholder_text: 'CSS class name',
      })
      this.box.append(this.style)

      this.remove_button = new Gtk.Button({
        icon_name: 'list-remove-symbolic',
        valign: Gtk.Align.CENTER,
      })
      this.add_suffix(this.remove_button)

      this.remove_button.connect('clicked', () => this.emit('removed'))

      this.pattern.connect('changed', this.#changed.bind(this))
      this.style.connect('changed', this.#changed.bind(this))
    }

    get valid() {
      const pattern = this.pattern.text.trim()
      const style = this.style.text.trim()
      return pattern && style
    }

    refreshed() {
      if (this.valid) {
        this.icon.icon_name = 'emblem-ok-symbolic'
      }
    }

    #changed() {
      this.emit('changed')
      if (this.valid) {
        this.icon.icon_name = 'document-save-symbolic'
      } else {
        this.icon.icon_name = 'dialog-error-symbolic'
      }
    }
  },
)

const OpenFileRow = GObject.registerClass(
  {},
  class OpenFileRow extends Adw.ActionRow {
    path

    constructor(props = {}) {
      super(props)

      const file_button = new Gtk.Button({
        icon_name: 'emblem-documents-symbolic',
        valign: Gtk.Align.CENTER,
      })
      const dir_button = new Gtk.Button({
        icon_name: 'folder-open-symbolic',
        valign: Gtk.Align.CENTER,
      })
      this.add_suffix(file_button)
      this.add_suffix(dir_button)

      file_button.connect('clicked', () => {
        Cmd.cmd(['xdg-open', this.path])
      })

      dir_button.connect('clicked', () => {
        const dir = GLib.path_get_dirname(this.path)
        Cmd.cmd(['xdg-open', dir])
      })
    }
  },
)

const ResetRow = GObject.registerClass(
  {},
  class ResetRow extends Adw.ActionRow {
    constructor(window, settings, props = {}) {
      super(props)
      this.window = window
      this.settings = settings

      const button = new Gtk.Button({
        icon_name: 'edit-clear-symbolic',
        valign: Gtk.Align.CENTER,
      })
      this.add_suffix(button)

      button.connect('clicked', () => {
        const dialog = new Gtk.MessageDialog({
          text: _('Reset Settings'),
          secondary_text: _('Are you sure to restore all settings to their default values'),
          message_type: Gtk.MessageType.QUESTION,
          buttons: Gtk.ButtonsType.OK_CANCEL,
          modal: true,
          transient_for: this.window,
        })

        dialog.connect('response', (dialog, resp) => {
          dialog.destroy()
          switch (resp) {
            case Gtk.ResponseType.OK:
              this.#reset()
              break
            default:
              break
          }
        })
        dialog.show()
      })
    }

    #reset() {
      Globals.reset()
      const schema = this.settings.settings_schema
      const keys = schema.list_keys()
      keys.forEach((key) => this.settings.reset(key))
    }
  },
)

const BindingMapper = GObject.registerClass(
  {
    Properties: {
      'label-position': GObject.ParamSpec.string(
        'label-position',
        'Label Position',
        '',
        GObject.ParamFlags.READWRITE,
        '',
      ),
      'label-alignment': GObject.ParamSpec.string(
        'label-alignment',
        'Label Alignment',
        '',
        GObject.ParamFlags.READWRITE,
        '',
      ),
      'label-vertical': GObject.ParamSpec.string(
        'label-vertical',
        'Vertical Label Text',
        '',
        GObject.ParamFlags.READWRITE,
        '',
      ),
    },
  },
  class BindingMapper extends GObject.Object {
    constructor(props = {}) {
      super(props)
    }
  },
)

class Extension {
  #settings
  #mapper

  constructor() {
    ExtensionUtils.initTranslations()
    this.#settings = new ExtensionUtils.getSettings()
    this.#mapper = new BindingMapper()
  }

  fillPreferencesWindow(window) {
    const page = new Adw.PreferencesPage({
      title: _('General'),
      icon_name: 'dialog-information',
    })
    window.add(page)

    /* Borders */

    const border_group = new Adw.PreferencesGroup({ title: _('Borders') })
    page.add(border_group)

    const border_width = new SpinRow({ title: _('Width') })
    border_width.spin.adjustment.lower = 0
    border_width.spin.adjustment.upper = 100
    border_width.spin.adjustment.step_increment = 1
    border_group.add(border_width)

    const border_padding = new SpinRow({ title: _('Padding') })
    border_padding.spin.adjustment.lower = -100
    border_padding.spin.adjustment.upper = 100
    border_padding.spin.adjustment.step_increment = 1
    border_group.add(border_padding)

    const border_opacity = new ScaleRow({ title: _('Opacity') })
    border_group.add(border_opacity)

    /* Labels */

    const label_group = new Adw.PreferencesGroup({ title: _('Labels') })
    page.add(label_group)

    const label_enabled = new SwitchRow({ title: _('Labels') })
    label_group.add(label_enabled)

    const label_dom0_visible = new SwitchRow({ title: _('Dom0 Labels') })
    label_group.add(label_dom0_visible)

    const label_dispvm_template = new SwitchRow({ title: _('DispVM Template Name') })
    label_group.add(label_dispvm_template)

    const label_opacity = new ScaleRow({ title: _('Opacity') })
    label_group.add(label_opacity)

    const positions = Gtk.StringList.new(Globals.label_style.enums.position)
    const label_position = new Adw.ComboRow({
      title: _('Position'),
      model: positions,
    })
    label_group.add(label_position)

    const alignments = Gtk.StringList.new(Globals.label_style.enums.alignment)
    const label_alignment = new Adw.ComboRow({
      title: _('Alignment'),
      model: alignments,
    })
    label_group.add(label_alignment)

    const label_offset = new SpinRow({ title: _('Offset') })
    label_offset.spin.adjustment.step_increment = 1
    label_group.add(label_offset)

    const label_inset = new SpinRow({ title: _('Inset') })
    label_group.add(label_inset)

    const verticals = Gtk.StringList.new(Globals.label_style.enums.vertical)
    const label_vertical = new Adw.ComboRow({
      title: _('Vertical Text'),
      model: verticals,
    })
    label_group.add(label_vertical)

    /* Colors */

    const color_group = new Adw.PreferencesGroup({ title: _('Colors') })
    page.add(color_group)

    // For translations
    _('Pending')
    _('Error')
    _('Dom0')
    _('Red')
    _('Orange')
    _('Yellow')
    _('Green')
    _('Gray')
    _('Blue')
    _('Purple')
    _('Black')

    for (const name of Globals.special_labels) {
      const title = name.charAt(0).toUpperCase() + name.slice(1)
      const transparent_allowed = Globals.transparent_allowed_labels.includes(name)
      const row = new ColorRow(transparent_allowed, true, { title: _(title) })
      row.color_label = name
      row.color = Globals.colors[name]
      color_group.add(row)
      row.bind_property('color', Globals.colors, name, GObject.BindingFlags.BIDIRECTIONAL)
    }

    Cmd.load_color_labels().then(() => {
      const vm_labels = new VmLabelsRow({ title: _('VM Labels') })
      color_group.add(vm_labels)
    })

    /* WM Styles */

    const style_group = new StyleGroup({
      title: _('Window Style Classes'),
      description: _('CSS style classes for windows'),
    })
    page.add(style_group)

    /* Extra */

    const extra_group = new Adw.PreferencesGroup({ title: _('Others') })
    page.add(extra_group)

    const open_stylesheet = new OpenFileRow({
      title: _('Open stylesheet.css'),
    })
    open_stylesheet.path = `${Me.path}/stylesheet.css`
    extra_group.add(open_stylesheet)

    const reset = new ResetRow(window, this.#settings, {
      title: _('Reset Settings'),
      subtitle: _('Restore all settings to their default values.'),
    })
    extra_group.add(reset)

    /* Bindings */

    const g = this.#settings
    const mapper = this.#mapper

    mapper.bind_property_full(
      'label-position',
      label_position,
      'selected',
      GObject.BindingFlags.BIDIRECTIONAL,
      (binding, name) => {
        return [true, Globals.label_style.enums.position.indexOf(name)]
      },
      (binding, idx) => {
        return [true, Globals.label_style.enums.position[idx]]
      },
    )
    mapper.bind_property_full(
      'label-alignment',
      label_alignment,
      'selected',
      GObject.BindingFlags.BIDIRECTIONAL,
      (binding, name) => {
        return [true, Globals.label_style.enums.alignment.indexOf(name)]
      },
      (binding, idx) => {
        return [true, Globals.label_style.enums.alignment[idx]]
      },
    )
    mapper.bind_property_full(
      'label-vertical',
      label_vertical,
      'selected',
      GObject.BindingFlags.BIDIRECTIONAL,
      (binding, name) => {
        return [true, Globals.label_style.enums.vertical.indexOf(name)]
      },
      (binding, idx) => {
        return [true, Globals.label_style.enums.vertical[idx]]
      },
    )

    g.bind('border-width', border_width, 'value', Gio.SettingsBindFlags.DEFAULT)
    g.bind('border-padding', border_padding, 'value', Gio.SettingsBindFlags.DEFAULT)
    g.bind('border-opacity', border_opacity, 'value', Gio.SettingsBindFlags.DEFAULT)

    g.bind('label-enabled', label_enabled, 'active', Gio.SettingsBindFlags.DEFAULT)
    g.bind('label-dom0-visible', label_dom0_visible, 'active', Gio.SettingsBindFlags.DEFAULT)
    g.bind('label-dispvm-template', label_dispvm_template, 'active', Gio.SettingsBindFlags.DEFAULT)
    g.bind('label-opacity', label_opacity, 'value', Gio.SettingsBindFlags.DEFAULT)
    g.bind('label-position', mapper, 'label-position', Gio.SettingsBindFlags.DEFAULT)
    g.bind('label-alignment', mapper, 'label-alignment', Gio.SettingsBindFlags.DEFAULT)
    g.bind('label-offset', label_offset, 'value', Gio.SettingsBindFlags.DEFAULT)
    g.bind('label-inset', label_inset, 'value', Gio.SettingsBindFlags.DEFAULT)
    g.bind('label-vertical', mapper, 'label-vertical', Gio.SettingsBindFlags.DEFAULT)

    const binding_flags = GObject.BindingFlags.DEFAULT | GObject.BindingFlags.SYNC_CREATE
    label_enabled.bind_property('active', label_dom0_visible, 'sensitive', binding_flags)
    label_enabled.bind_property('active', label_dispvm_template, 'sensitive', binding_flags)
    label_enabled.bind_property('active', label_opacity, 'sensitive', binding_flags)
    label_enabled.bind_property('active', label_position, 'sensitive', binding_flags)
    label_enabled.bind_property('active', label_alignment, 'sensitive', binding_flags)
    label_enabled.bind_property('active', label_offset, 'sensitive', binding_flags)
    label_enabled.bind_property('active', label_inset, 'sensitive', binding_flags)
    label_enabled.bind_property('active', label_vertical, 'sensitive', binding_flags)

    g.connect('changed', (g, name) => {
      const variant = g.get_value(name)
      switch (name) {
        case 'colors':
          this.#fetch_colors(variant)
          break
        case 'wm-class-styles':
          style_group.value = variant
          break
        default:
          break
      }
    })

    Globals.colors.connect('notify', (colors, pspec) => {
      const name = pspec.get_name()
      if (!Globals.special_labels.includes(name)) return
      const variant = this.#settings.get_value('colors')
      const obj = variant.deep_unpack()
      obj[name] = Globals.colors[name]
      const newvals = new GLib.Variant('a{ss}', obj)
      this.#settings.set_value('colors', newvals)
    })

    style_group.connect('notify::value', (group) => {
      this.#settings.set_value('wm-class-styles', group.value)
    })

    this.#fetch_colors()
    style_group.value = this.#settings.get_value('wm-class-styles')
  }

  #fetch_colors(variant = null) {
    if (!variant) {
      variant = this.#settings.get_value('colors')
    }
    const unpacked = variant.deep_unpack()
    for (const [key, val] of Object.entries(unpacked)) {
      if (!Globals.special_labels.includes(key)) continue
      Globals.colors.set_color(key, val)
    }
  }
}

let extension

function init() {
  extension = new Extension()
}

function fillPreferencesWindow(window) {
  extension.fillPreferencesWindow(window)
}
