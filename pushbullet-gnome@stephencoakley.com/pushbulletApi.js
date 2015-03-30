const Lang = imports.lang;
const Soup = imports.gi.Soup;


const ApiClient = new Lang.Class({
    Name: "ApiClient",

    _init: function(apiKey, onTickle) {
        this._apiKey = apiKey;
        this._onTickle = onTickle;

        this._httpSession = new Soup.Session({ ssl_use_system_ca_file: true });
        Soup.Session.prototype.add_feature.call(this._httpSession, new Soup.ProxyResolverDefault());
        this._httpSession.httpsAliases = ["wss"];

        this._httpSession.connect("authenticate", Lang.bind(this, this._authenticate));

        let message = new Soup.Message({
            method: "GET",
            uri: new Soup.URI("wss://stream.pushbullet.com/websocket/" + this._apiKey)
        });

        this._httpSession.websocket_connect_async(message, null, null, null, Lang.bind(this, function(session, res) {
            this._websocketConnection = this._httpSession.websocket_connect_finish(res);

            this._websocketConnection.connect("message", Lang.bind(this, function(connection, type, message) {
                var data = JSON.parse(message.get_data());

                if (data.type == "tickle" && data.subtype == "push") {
                    this._onTickle();
                }
            }));
        }));
    },

    getPushes: function(modifiedAfter, callback) {
        let message = new Soup.Message({
            method: "GET",
            uri: new Soup.URI("https://api.pushbullet.com/v2/pushes?modified_after=" + (modifiedAfter ? modifiedAfter : 0))
        });
        this._sendRequest(message, callback);
    },

    close: function() {
        this._websocketConnection.close(Soup.WebsocketCloseCode.NORMAL, "");
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
