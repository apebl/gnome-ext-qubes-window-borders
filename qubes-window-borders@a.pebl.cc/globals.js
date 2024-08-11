/* exported reset, colors, transparent_allowed_labels,
            special_labels, border_style, label_style,
            wm_class_styles, get_styles_for_wm_class,
            fatal_error, fatal_error_cb, notify_fatal_error */

const { GObject } = imports.gi

class Props {
  constructor(obj, cls) {
    const specs = {}
    const enums = {}
    for (const [key, val] of Object.entries(obj)) {
      const propname = key.replaceAll('_', '-')
      const nickname = propname.replaceAll('-', ' ')
      const type = typeof val
      switch (type) {
        case 'string':
          specs[propname] = GObject.ParamSpec.string(
            propname,
            nickname,
            '',
            GObject.ParamFlags.READWRITE,
            val,
          )
          break
        case 'boolean':
          specs[propname] = GObject.ParamSpec.boolean(
            propname,
            nickname,
            '',
            GObject.ParamFlags.READWRITE,
            val,
          )
          break
        default:
          if (val instanceof Props.Double) {
            specs[propname] = GObject.ParamSpec.double(
              propname,
              nickname,
              '',
              GObject.ParamFlags.READWRITE,
              val.min,
              val.max,
              val.val,
            )
          } else if (val instanceof Props.Enum) {
            enums[propname] = val.enum_vals
            const cur_val = val.enum_vals[val.idx]
            specs[propname] = GObject.ParamSpec.string(
              propname,
              nickname,
              '',
              GObject.ParamFlags.READWRITE,
              cur_val,
            )
            break
          } else {
            throw new Error(`Unsupported prop type: ${type} ${val}`)
          }
          break
      }
    }

    cls.prototype.reset = function () {
      for (const pspec of this.constructor.list_properties()) {
        this.set_property(pspec.get_name(), pspec.get_default_value())
      }
    }

    cls.prototype.get_default = function (name) {
      const pspec = this.constructor.find_property(name)
      return pspec.get_default_value()
    }

    const props = new (GObject.registerClass(
      {
        Properties: specs,
      },
      cls,
    ))()
    props.enums = enums
    return props
  }

  static Double = class {
    constructor(val, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
      Object.assign(this, { val, min, max })
    }
  }

  static Enum = class {
    constructor(idx, enum_vals) {
      Object.assign(this, { idx, enum_vals })
    }
  }
}

function reset() {
  colors.reset()
  colors_ready = false
  border_style.reset()
  label_style.reset()
  wm_class_styles.length = 0
  fatal_error = null
  fatal_error_cb = null
}

// #xxxxxx or transparent
var colors = new Props(
  {
    pending: '#e0ffff', // lightcyan
    error: '#ff00ff', // magenta
    dom0: '#ffffff',
    /*
    red: '#cc0000',
    orange: '#f57900',
    yellow: '#edd400',
    green: '#73d216',
    gray: '#555753',
    blue: '#3465a4',
    purple: '#75507b',
    black: '#000000',
*/
  },
  class Colors extends GObject.Object {
    #new_prop_id = 100

    constructor() {
      super()
    }

    set_color(name, val) {
      if (this.constructor.find_property(name) == null) {
        throw new Error(`'${name}' is not a valid label name`)
      }
      if (!val.match(/^(#[0-9a-fA-F]{6}|transparent)$/)) {
        throw new Error(`'${val}' is not a valid color`)
      }
      if (val === 'transparent' && !transparent_allowed_labels.includes(name)) {
        throw new Error(`'${name}' label is not allowed to be transparent`)
      }
      if (!special_labels.includes(name)) {
        throw new Error(`'${name}' label is not allowed to be changed`)
      }
      this[name] = val
    }

    register_color(label, color) {
      const disallowed = ['pending', 'error', 'dom0']
      if (disallowed.includes(label)) {
        throw new Error(`Color label '${label}' is not allowed to be registerd`)
      }
      if (!color.match(/^(#[0-9a-fA-F]{6})$/)) {
        throw new Error(`'${color}' is not a valid color`)
      }

      if (!this.constructor.find_property(label)) {
        const spec = GObject.ParamSpec.string(label, label, '', GObject.ParamFlags.READWRITE, color)
        this.constructor.install_property(this.#new_prop_id, spec)
        this.#new_prop_id += 1
      }
      this.set_property(label, color)
    }
  },
)
var transparent_allowed_labels = ['pending', 'dom0']
var special_labels = ['pending', 'error', 'dom0']
var colors_ready = false

var border_style = new Props(
  {
    width: new Props.Double(2, 0),
    padding: new Props.Double(0),
    opacity: new Props.Double(1, 0, 1),
  },
  class BorderStyle extends GObject.Object {
    constructor() {
      super()
    }
    get opacity_int() {
      return Math.trunc(this.opacity * 255)
    }
  },
)

var label_style = new Props(
  {
    enabled: true,
    dom0_visible: true,
    dispvm_template: true,
    opacity: new Props.Double(1, 0, 1),
    position: new Props.Enum(0, ['top', 'bottom', 'left', 'right']),
    alignment: new Props.Enum(0, ['start', 'center', 'end']),
    offset: new Props.Double(0.0),
    inset: new Props.Double(1.0),
    vertical: new Props.Enum(3, ['none', 'stacked', 'rotated-cw', 'rotated-ccw']),
  },
  class LabelStyle extends GObject.Object {
    constructor() {
      super()
    }
    get opacity_int() {
      return Math.trunc(this.opacity * 255)
    }
  },
)

var wm_class_styles = []

function get_styles_for_wm_class(wm_class_name, out = new Set()) {
  wm_class_styles.forEach(([regex, style]) => {
    const match = wm_class_name.match(regex)
    if (match) out.add(style)
  })
  return out
}

var fatal_error = null
var fatal_error_cb = null

function notify_fatal_error(err) {
  if (fatal_error) return
  fatal_error = err
  if (fatal_error_cb) fatal_error_cb(err)
}
