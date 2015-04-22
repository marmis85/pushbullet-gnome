const Lang = imports.lang;
const Soup = imports.gi.Soup;


const SocketClient = new Lang.Class({
    Name: "SocketClient",

    _init: function(apiClient, onTickle) {
        this._onTickle = onTickle;

        apiClient._httpSession.httpsAliases = ["wss"];

        let message = new Soup.Message({
            method: "GET",
            uri: new Soup.URI("wss://stream.pushbullet.com/websocket/" + apiClient._apiKey)
        });

        apiClient._httpSession.websocket_connect_async(message, null, null, null, Lang.bind(this, function(session, res) {
            this._websocketConnection = session.websocket_connect_finish(res);

            this._websocketConnection.connect("message", Lang.bind(this, function(connection, type, message) {
                var data = JSON.parse(message.get_data());

                if (data.type == "tickle" && data.subtype == "push") {
                    this._onTickle();
                }
            }));
        }));
    },

    close: function() {
        this._websocketConnection.close(Soup.WebsocketCloseCode.NORMAL, "");
    }
});
