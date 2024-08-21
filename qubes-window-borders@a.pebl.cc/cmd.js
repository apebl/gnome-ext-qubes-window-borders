/* exported cmd, qubes_admin_api, get_vm_props, delay, try_times, get_window_id,
            get_vmname, list_color_labels, get_label_color, list_label_colors,
            load_color_labels */

const { GLib, Gio } = imports.gi

const ExtensionUtils = imports.misc.extensionUtils

const Me = ExtensionUtils.getCurrentExtension()
const Globals = Me.imports.globals

Gio._promisify(Gio.Subprocess.prototype, 'communicate_utf8_async')

async function cmd(argv, cancellable = null) {
  const flags = Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
  const proc = new Gio.Subprocess({ argv: argv, flags: flags })
  proc.init(cancellable)

  const cancel_id = cancellable ? cancellable.connect(() => proc.force_exit()) : 0

  try {
    const [out, err] = await proc.communicate_utf8_async(null, null)
    const status = proc.get_exit_status()
    if (status !== 0) {
      throw new Gio.IOErrorEnum({
        code: Gio.IOErrorEnum.FAILED,
        message: err.trim()
          ? err.trim()
          : `Command '${argv.join(' ')}' failed with exit code ${status}`,
      })
    }
    return out.trim()
  } finally {
    if (cancel_id > 0) {
      cancellable.disconnect(cancel_id)
    }
  }
}

async function qubes_admin_api(call, arg = null, cancellable = null) {
  const query_argv = ['qubesd-query', '--empty', 'dom0', call, 'dom0']
  if (arg) query_argv.push(arg)
  const query = query_argv.join(' ')
  // To handle a null character in the output.
  const argv = ['sh', '-c', `${query} | tr '\\0' '/'`]
  const output = await cmd(argv, cancellable)

  const idx = output.indexOf('/')
  const msg_type = output.substr(0, idx)
  if (msg_type !== '0') {
    throw new Error(`Error returned from Qubes Admin API: ${output}`)
  }
  return output.substr(idx + 1).trim()
}

async function get_vm_props(vmname, cancellable = null) {
  const output = await cmd(['qvm-prefs', vmname], cancellable)
  const lines = output.split('\n')
  const res = new Map()
  for (const line of lines) {
    const arr = line.split(/\s+/)
    res.set(arr[0], arr[2]) // value may be undefined
  }
  return res
}

async function delay(ms, cancellable = null) {
  let delay_id = 0
  let cancel_id = 0
  const promise = new Promise((resolve) => {
    delay_id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
      delay_id = 0
      resolve()
      return GLib.SOURCE_REMOVE
    })
  })
  if (cancellable) {
    cancel_id = cancellable.connect(() => {
      if (delay_id > 0) {
        GLib.Source.remove(delay_id)
      }
    })
  }
  await promise.finally(() => {
    if (cancel_id > 0) {
      cancellable.disconnect(cancel_id)
    }
  })
}

async function try_times(async_func, times, interval, cancellable = null) {
  while (times > 0) {
    try {
      const res = await async_func()
      return res
    } catch (err) {
      times -= 1
      if (times === 0) throw err
      if (cancellable?.is_cancelled()) {
        throw new Error('Cmd.try_times cancelled')
      }
      logErr(err.message, 'Tried and get an error: ')
      delay(interval, cancellable)
      if (cancellable?.is_cancelled()) {
        throw new Error('Cmd.try_times cancelled')
      }
    }
  }
}

function get_window_id(meta_win) {
  const desc = meta_win.get_description().trim()
  const match = desc?.match(/^0x[0-9a-f]+$/)
  if (!match) {
    throw new Error('Could not fetch X11 window ID')
  }
  return match[0]
}

async function get_vmname(id, cancellable = null) {
  const out = await cmd(['xprop', '_QUBES_VMNAME', '-id', id], cancellable)
  if (!out.startsWith('_QUBES_VMNAME(STRING)')) {
    return 'dom0'
  }
  const name = out.split('"')[1]
  // Something went wrong
  if (!name) {
    throw new Error(`Could not fetch VM name of the window(${id})`)
  }
  return name
}

async function list_color_labels(cancellable = null) {
  const output = await qubes_admin_api('admin.label.List', null, cancellable)
  return output.split('\n').filter((label) => label)
}

async function get_label_color(label, cancellable = null) {
  const output = await qubes_admin_api('admin.label.Get', label, cancellable)
  return output.replace('0x', '#')
}

async function list_label_colors(cancellable = null) {
  const list = await list_color_labels(cancellable)
  const promises = []
  for (const label of list) {
    const p = get_label_color(label, cancellable)
    promises.push(p)
  }
  const colors = await Promise.all(promises)
  const result = {}
  for (const [idx, label] of list.entries()) {
    result[label] = colors[idx]
  }
  return result
}

async function load_color_labels(cancellable = null) {
  const colors = await list_label_colors(cancellable)
  for (const [label, color] of Object.entries(colors)) {
    Globals.colors.register_color(label, color)
  }
}
