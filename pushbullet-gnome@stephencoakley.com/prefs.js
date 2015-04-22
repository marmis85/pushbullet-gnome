const Gtk = imports.gi.Gtk;
const Config = imports.misc.config;

const Pushbullet = imports.misc.extensionUtils.getCurrentExtension();
const Settings = Pushbullet.imports.settings;


let settings;

function init() {
    settings = new Settings.Settings("org.gnome.shell.extensions.pushbullet");
}

function buildPrefsWidget() {
    let grid = new Gtk.Grid({ border_width: 32, column_spacing: 16, row_spacing: 16 });

    let api_key_label = new Gtk.Label({ label: "Pushbullet API Key", xalign: 1 });

    let api_key_entry = new Gtk.Entry({ hexpand: true });
    api_key_entry.text = settings.get_string("api-key");
    api_key_entry.connect("changed", function(entry) {
        settings.set_string("api-key", entry.text);
    });

    let downloads_folder_label = new Gtk.Label({ label: "Downloads folder", xalign: 1 });

    let downloads_folder_button = new Gtk.FileChooserButton({ title: "Pick Folder", action: Gtk.FileChooserAction.SELECT_FOLDER });
    downloads_folder_button.set_current_folder(settings.getDownloadsFolder());
    downloads_folder_button.connect("file-set", function(button) {
        settings.set_string("downloads-folder", button.get_filename());
    });

    grid.attach(api_key_label, 0, 0, 1, 1);
    grid.attach(api_key_entry, 1, 0, 1, 1);
    grid.attach(downloads_folder_label, 0, 1, 1, 1);
    grid.attach(downloads_folder_button, 1, 1, 1, 1);

    grid.show_all();

    return grid;
}
