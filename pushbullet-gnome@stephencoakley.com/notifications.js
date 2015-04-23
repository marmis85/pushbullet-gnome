const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Main = imports.ui.main;
const MessageTray = imports.ui.messageTray;

const Pushbullet = imports.misc.extensionUtils.getCurrentExtension();


const NotificationManager = new Lang.Class({
    Name: "NotificationManager",

    _init: function(apiClient, maxPushCount) {
        this._apiClient = apiClient;
        this._source = new NotificationSource(maxPushCount);

        Main.messageTray.add(this._source);
    },

    /**
     * Unregisters the source in the UI.
     */
    unregister: function() {
        this._source.destroy(MessageTray.NotificationDestroyedReason.SOURCE_CLOSED);
    },

    showPush: function(push) {
        this._clearPush(push);

        if (!push.active || push.dismissed)
            return;

        switch (push.type) {
            case "note":
                var notification = this._noteNotification(push);
                break;
            case "link":
                var notification = this._linkNotification(push);
                break;
            case "file":
                var notification = this._fileNotification(push);
                break;
            default:
                return;
        }
        notification.push = push;

        this._showNotification(notification);
    },

    _noteNotification: function(push) {
        let title = "" + (push.title ? push.title : "Note");
        return new MessageTray.Notification(this._source, title, push.body);
    },

    _linkNotification: function(push) {
        let title = "" + (push.title ? push.title : "Link");
        let body = push.url + (push.body ? "\n" + push.body : "");
        return new MessageTray.Notification(this._source, title, body);
    },

    _fileNotification: function(push) {
        let title = "" + (push.title ? push.title : "File");
        let body = push.file_name + (push.body ? "\n" + push.body : "");
        let notification = new MessageTray.Notification(this._source, title, body);
        notification.addAction("Download File", Lang.bind(this, this._saveFile, push.file_url, push.file_name));
        return notification;
    },

    _showNotification: function(notification) {
        notification.destroyHandler = notification.connect("destroy", Lang.bind(this, function(notification, reason) {
            notification.disconnect(notification.destroyHandler);
            if (reason == MessageTray.NotificationDestroyedReason.DISMISSED) {
                //TODO: call dismiss on the API
            }
        }));

        notification.connect("activated", Lang.bind(this, function(notification) {
            notification.disconnect(notification.destroyHandler);
            this.showPush(notification.push);
            Main.panel.closeCalendar();
        }));

        this._source.notify(notification);
    },

    _showDownloadComplete: function(file_path) {
        var folder_path = file_path.substring(0, file_path.lastIndexOf("/") + 1);

        let notification = new MessageTray.Notification(this._source, "Download Complete", file_path);

        notification.addAction("Open File", Lang.bind(this, this._openFile, file_path));
        notification.addAction("View Folder", Lang.bind(this, this._openFile, folder_path));

        notification.connect("activated", Lang.bind(this, function(notification_) {
            this._showDownloadComplete(file_path);
            Main.panel.closeCalendar();
        }));

        this._source.notify(notification);
    },

    _openFile: function(file_path) {
        GLib.spawn_command_line_async("xdg-open \"" + file_path + "\"");
    },

    _saveFile: function(file_url, file_name) {
        this._apiClient.downloadFile(file_url, file_name, Lang.bind(this, function(dest_file) {
            if (dest_file) this._showDownloadComplete(dest_file);
        }));
    },

    _clearPush: function(push) {
        this._source.notifications.forEach(function(notification, index, notifications) {
            if (notification.push.iden == push.iden) notification.destroy(MessageTray.NotificationDestroyedReason.EXPIRED);
        });
    }
});


/**
 * The notification source for Pushbullet notifications.
 */
const NotificationSource = new Lang.Class({
    Name: "NotificationSource",
    Extends: MessageTray.Source,

    _init: function(maxPushCount) {
        this.parent("Pushbullet", "pushbullet");
        this.policy.forceExpanded = true;
        this.maxPushCount = maxPushCount;
    },

    pushNotification: function(notification) {
        if (this.notifications.indexOf(notification) >= 0)
            return;

        while (this.notifications.length >= this.maxPushCount)
            this.notifications.shift().destroy(MessageTray.NotificationDestroyedReason.EXPIRED);

        notification.connect('destroy', Lang.bind(this, this._onNotificationDestroy));
        notification.connect('acknowledged-changed', Lang.bind(this, this.countUpdated));
        this.notifications.push(notification);
        this.emit('notification-added', notification);

        this.countUpdated();
    },

    _onNotificationDestroy: function(notification) {
        let index = this.notifications.indexOf(notification);
        if (index < 0)
            return;

        this.notifications.splice(index, 1);

        this.countUpdated();
    }
});
