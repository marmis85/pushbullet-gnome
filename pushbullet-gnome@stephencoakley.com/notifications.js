const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;

const Pushbullet = imports.misc.extensionUtils.getCurrentExtension();


/**
 * The notification source for Pushbullet notifications.
 */
const NotificationSource = new Lang.Class({
    Name: "NotificationSource",

    _init: function() {
        this._source = new MessageTray.Source("Pushbullet", "pushbullet");
        this._source.policy.forceExpanded = true;

        Main.messageTray.add(this._source);

        this._notifications = new Map();
    },

    /**
     * Unregisters the source in the UI.
     */
    unregister: function() {
        this._source.destroy(MessageTray.NotificationDestroyedReason.SOURCE_CLOSED);
    },

    handlePush: function(push) {
        this.dismiss(push)

        if (push.active && !push.dismissed) {
            this.showPush(push);
        }
    },

    showPush: function(push) {
        if (push.type == "note") {
            this.showNotePush(push);
        }
        else if (push.type == "link") {
            this.showLinkPush(push);
        }
        else if (push.type == "file") {
            this.showFilePush(push);
        }
    },

    showNotePush: function(push) {
        let notification = new MessageTray.Notification(this._source, push.title, push.body);
        this._showNotification(push, notification);
    },

    showLinkPush: function(push) {
        let notification = new MessageTray.Notification(this._source, push.title, push.url);
        this._showNotification(push, notification);
    },

    showFilePush: function(push) {
        let notification = new MessageTray.Notification(this._source, push.title, push.file_name);
        notification.addAction("Download File", Lang.bind(this, this.openFile, push.file_url));
        this._showNotification(push, notification);
    },

    _showNotification: function(push, notification) {
        notification.connect("activated", Lang.bind(this, function(notification_) {
            let handler = notification.connect("destroy", Lang.bind(this, function(notification__, reason__) {
                notification.disconnect(handler);
                this.showPush(push);
                Main.panel.closeCalendar();
            }));
        }));
        this._source.notify(notification);
        this._notifications.set(push.iden, notification);
    },

    dismiss: function(push) {
        let notification = this._notifications.get(push.iden);
        if (notification) {
            this._notifications.get(push.iden).destroy(MessageTray.NotificationDestroyedReason.DISMISSED);
            this._notifications.delete(push.iden);
        }
    },

    openFile: function(file_url) {
        GLib.spawn_command_line_async("xdg-open \"" + file_url + "\"");
    }
});
