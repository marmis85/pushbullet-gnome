const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;
const Main = imports.ui.main;
const MainLoop = imports.mainloop;

const Pushbullet = imports.misc.extensionUtils.getCurrentExtension();
const Notifications = Pushbullet.imports.notifications;
const PushbulletApi = Pushbullet.imports.pushbulletApi;
const EventStream = Pushbullet.imports.eventStream;
const Settings = Pushbullet.imports.settings;


let settings, notifications, apiClient, socketClient;

/**
 * Initializes the extension.
 *
 * @param Object metadata
 * The metadata of the extension.
 */
function init(metadata) {
    // thanks Philipp Hoffmann
    let theme = Gtk.IconTheme.get_default();
    theme.append_search_path(metadata.path + "/icons");
}

/**
 * Enables the extension features.
 */
function enable() {
    settings = new Settings.Settings("org.gnome.shell.extensions.pushbullet");

    if (settings.get_string("api-key") != "") {
        apiClient = new PushbulletApi.ApiClient(settings);
        socketClient = new EventStream.SocketClient(apiClient, refreshPushes);
        notifications = new Notifications.NotificationManager(apiClient, settings.get_int("max-push-count"));

        refreshPushes();
    }
}

function refreshPushes() {
    apiClient.getPushes(settings.get_double("last-checked"), function(response) {
        if (response.error) {
            notifications.showNotePush({ title: "Error", body: response.error.message });
        }
        else {
            let modified = response.pushes[0].modified;
            response.pushes.reverse().forEach(function(push, index, pushes) {
                notifications.showPush(push);
            });

            // update last checked timestamp
            settings.set_double("last-checked", modified);
        }
    });
}

/**
 * Disbales the extension features.
 */
function disable() {
    notifications.unregister();
    socketClient.close();
}
