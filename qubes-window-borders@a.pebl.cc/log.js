/* exported error, notify */

const { Gio } = imports.gi

const Main = imports.ui.main
const MessageTray = imports.ui.messageTray
const ExtensionUtils = imports.misc.extensionUtils
const _ = ExtensionUtils.gettext

function error(err, msg = null) {
  logError(err)
  notify(msg ?? _('ERROR: An error occured in Qubes Window Borders'), err.message)
}

function notify(msg, details) {
  try {
    const source = new MessageTray.SystemNotificationSource()
    Main.messageTray.add(source)
    const notification = new MessageTray.Notification(source, msg, details)
    notification.setUrgency(MessageTray.Urgency.CRITICAL)
    source.showNotification(notification)
  } catch (err) {
    logError(err)
  }
}
