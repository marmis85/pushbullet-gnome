const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;
const St = imports.gi.St;

const Pushbullet = imports.misc.extensionUtils.getCurrentExtension();


/**
 * The notification source for Pushbullet notifications.
 */
const NotificationSource = new Lang.Class({
    Name: "NotificationSource",

    _init: function() {
        this._source = new MessageTray.Source("Pushbullet", "pushbullet");
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
        if (push.active && !push.dismissed) {
            if (this._notifications.has(push.iden))
                this.updatePush(push);
            else this.showPush(push);
        }
        else this.dismiss(push);
    },

    showPush: function(push) {
        if (push.type == "note") {
            this.showNotePush(push);
        }
        else if (push.type == "link") {
            this.showLinkPush(push);
        }
        else if (push.type == "address") {
            this.showAddressPush(push);
        }
        else if (push.type == "checklist") {
            this.showChecklistPush(push);
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

    showAddressPush: function(push) {
        let notification = new MessageTray.Notification(this._source, "Dummy", "Address");
        this._showNotification(push, notification);
    },

    showChecklistPush: function(push) {
        let notification = new MessageTray.Notification(this._source, "Dummy", "Checl List");
        this._showNotification(push, notification);
    },

    showFilePush: function(push) {
        let notification = new MessageTray.Notification(this._source, push.title, push.file_name);
        notification.addAction("Download File", Lang.bind(this, this.openFile, push.file_url));
        this._showNotification(push, notification);
    },

    _showNotification: function(push, notification) {
        this._source.notify(notification);
        this._notifications.set(push.iden, notification);
    },

    updatePush: function(push) {
        if (push.type == "note") {
            this.updateNotePush(push);
        }
        else if (push.type == "link") {
            this.updateLinkPush(push);
        }
        else if (push.type == "address") {
            this.updateAddressPush(push);
        }
        else if (push.type == "checklist") {
            this.updateChecklistPush(push);
        }
        else if (push.type == "file") {
            this.updateFilePush(push);
        }
    },

    updateNotePush: function(push) {
        let notification = this._notifications.get(push.iden);
        if (notification) {
            notification.update(push.title, push.body);
        }
    },

    updateLinkPush: function(push) {
        let notification = this._notifications.get(push.iden);
        if (notification) {
            notification.update(push.title, push.url);
        }
    },

    updateAddressPush: function(push) {},

    updateChecklistPush: function(push) {},

    updateFilePush: function(push) {
        let notification = this._notifications.get(push.iden);
        if (notification) {
            notification.update(push.title, push.file_name, { clear: true });
            notification.addAction("Download File", Lang.bind(this, this.openFile, push.file_url));
        }
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
