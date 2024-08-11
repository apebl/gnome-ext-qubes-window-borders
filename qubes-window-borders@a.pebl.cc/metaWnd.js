/* exported MetaWnd */

const { Gio, Meta } = imports.gi

const Main = imports.ui.main
const ExtensionUtils = imports.misc.extensionUtils
const _ = ExtensionUtils.gettext

const Me = ExtensionUtils.getCurrentExtension()
const Cmd = Me.imports.cmd
const Globals = Me.imports.globals

var MetaWnd = class MetaWnd {
  meta_win
  actor
  id
  wm_class

  vmname = 'PENDING'
  color_label = 'pending'
  vm_type
  vm_template

  #cancellable = new Gio.Cancellable()

  constructor(actor) {
    if (!(actor instanceof Meta.WindowActor)) {
      throw new Error('actor must be an instance of Meta.WindowActor')
    }
    this.meta_win = actor.get_meta_window()
    if (!this.meta_win) {
      throw new Error('Failed to get a Meta.Window from a Meta.WindowActor')
    }
    this.actor = actor
    this.id = Cmd.get_window_id(this.meta_win)
    this.wm_class = [this.meta_win.get_wm_class_instance(), this.meta_win.get_wm_class()]
  }

  async fetch_props() {
    try {
      const vmname = await Cmd.get_vmname(this.id, this.#cancellable)

      while (!Globals.colors_ready && !Globals.fatal_error) {
        await Cmd.delay(100, this.#cancellable)
        const cancellable = this.#cancellable
        if (!cancellable || cancellable.is_cancelled()) return
      }

      if (Globals.fatal_error) {
        this.vmname = '<!> ERROR <!>'
        this.color_label = 'error'
        return
      }

      const vm_props = await Cmd.get_vm_props(vmname, this.#cancellable)

      const color_label = vmname === 'dom0' ? 'dom0' : vm_props.get('label')
      if (!(color_label in Globals.colors)) {
        throw new Error(`Unsupported color label: ${color_label}`)
      }

      this.vmname = vmname
      this.color_label = color_label
      this.vm_type = vm_props.get('klass')
      this.vm_template = vm_props.get('template')
      vm_props.clear()
    } catch (err) {
      this.vmname = '<!> ERROR <!>'
      this.color_label = 'error'
      logError(err)
    } finally {
      this.#cancellable = null
    }
  }

  dispose() {
    if (this.#cancellable) this.#cancellable.cancel()
    this.#cancellable = null
  }
}
