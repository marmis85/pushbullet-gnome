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
    notifications = new Notifications.NotificationSource();

    if (settings.get_string("api-key") != "") {
        apiClient = new PushbulletApi.ApiClient(settings.get_string("api-key"));
        socketClient = new EventStream.SocketClient(apiClient, refreshPushes);

        refreshPushes();
    }
}

function refreshPushes() {
    apiClient.getPushes(settings.get_double("last-checked"), function(response) {
        if (response.error) {
            notifications.showNotePush({ title: "Error", body: response.error.message });
        }
        else {
            let filtered = response.pushes.slice(0, settings.get_int("max-push-count"));

            for (n = filtered.length - 1; n >= 0; n--) {
                notifications.handlePush(filtered[n]);
            }

            // update last checked timestamp
            settings.set_double("last-checked", response.pushes[0].modified);
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
