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

    _init: function(apiClient) {
        this._apiClient = apiClient;
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
        let title = "" + (push.title ? push.title : "Note");
        let notification = new MessageTray.Notification(this._source, title, push.body);
        this._showNotification(push, notification);
    },

    showLinkPush: function(push) {
        let title = "" + (push.title ? push.title : "Link");
        let body = push.url + (push.body ? "\n" + push.body : "");
        let notification = new MessageTray.Notification(this._source, title, body);
        this._showNotification(push, notification);
    },

    showFilePush: function(push) {
        let title = "" + (push.title ? push.title : "File");
        let body = push.file_name + (push.body ? "\n" + push.body : "");
        let notification = new MessageTray.Notification(this._source, title, body);
        notification.addAction("Download File", Lang.bind(this, this.saveFile, push.file_url, push.file_name));
        this._showNotification(push, notification);
    },

    _showNotification: function(push, notification) {
        let handler = notification.connect("destroy", Lang.bind(this, function(notification__, reason__) {
            notification.disconnect(handler);
            this._notifications.delete(push.iden);
        }));
        notification.connect("activated", Lang.bind(this, function(notification_) {
            notification.disconnect(handler);
            let handler_ = notification.connect("destroy", Lang.bind(this, function(notification__, reason__) {
                notification.disconnect(handler_);
                this.showPush(push);
                Main.panel.closeCalendar();
            }));
        }));
        this._source.notify(notification);
        this._notifications.set(push.iden, notification);
    },

    showDownloadComplete: function(file_path) {
        var folder_path = file_path.substring(0, file_path.lastIndexOf("/") + 1);

        let notification = new MessageTray.Notification(this._source, "Download Complete", file_path);
        notification.addAction("Open File", Lang.bind(this, this.openFile, file_path));
        notification.addAction("View Folder", Lang.bind(this, this.openFile, folder_path));
        notification.connect("activated", Lang.bind(this, function(notification_) {
            let handler = notification.connect("destroy", Lang.bind(this, function(notification__, reason__) {
                notification.disconnect(handler);
                this.showDownloadComplete(file_path);
                Main.panel.closeCalendar();
            }));
        }));
        this._source.notify(notification);
    },

    dismiss: function(push) {
        let notification = this._notifications.get(push.iden);
        if (notification) {
            this._notifications.get(push.iden).destroy(MessageTray.NotificationDestroyedReason.DISMISSED);
        }
    },

    openFile: function(file_path) {
        GLib.spawn_command_line_async("xdg-open \"" + file_path + "\"");
    },

    saveFile: function(file_url, file_name) {
        this._apiClient.downloadFile(file_url, file_name, Lang.bind(this, function(dest_file) {
            if (dest_file) this.showDownloadComplete(dest_file);
        }));
    }
});
