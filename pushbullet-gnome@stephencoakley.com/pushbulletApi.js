const GLib = imports.gi.GLib;
const Lang = imports.lang;
const Soup = imports.gi.Soup;


const ApiClient = new Lang.Class({
    Name: "ApiClient",

    _init: function(settings) {
        this._settings = settings;
        this._apiKey = settings.get_string("api-key");

        this._httpSession = new Soup.Session({ ssl_use_system_ca_file: true });
        Soup.Session.prototype.add_feature.call(this._httpSession, new Soup.ProxyResolverDefault());

        this._httpSession.connect("authenticate", Lang.bind(this, this._authenticate));
    },

    getPushes: function(modifiedAfter, callback) {
        let message = new Soup.Message({
            method: "GET",
            uri: new Soup.URI("https://api.pushbullet.com/v2/pushes?" + (modifiedAfter ? "modified_after=" + modifiedAfter : "active=true"))
        });
        this._sendRequest(message, callback);
    },

    downloadFile: function(file_url, file_name, callback) {
        let message = new Soup.Message({
            method: "GET",
            uri: new Soup.URI(file_url)
        });

        this._httpSession.queue_message(message, Lang.bind(this, function(session, message, file_name, callback) {
            let downloads_folder = this._settings.getDownloadsFolder();
            let dest_file = downloads_folder + "/" + file_name;
            let ret = GLib.file_set_contents(dest_file, message.response_body_data.get_data());
            return callback(dest_file);
        }, file_name, callback));
    },

    _sendRequest: function(message, callback) {
        this._httpSession.queue_message(message, Lang.bind(this, function(session, message, callback) {
            let response = JSON.parse(message.response_body.data);
            return callback(response);
        }, callback));
    },

    _authenticate: function(session, message, auth, retrying, user_data) {
        auth.authenticate(this._apiKey, "");
    }
});
