module.exports = {
  /*
   * The main method of the plugin where you can register to internal events.
   * Below the full reference of all available events.
   */
  install: function (events) {
    console.log('Example plugin is successfully loaded !');

    events.on('started-server', this.onServerStarted);
    events.on('joined-channel', this.onJoinedChannel);
    events.on('left-channel', this.onLeftChannel);
    events.on('authenticating', this.onAuthenticating);
    events.on('authenticated', this.onAuthenticated);
    events.on('sending-message', this.onSendingMessage);
    events.on('broadcasting-message', this.onBroadcastingMessage);
  },

  /*
   * When the server is started
   */
  onServerStarted: function (options) {
    console.log(new Date().toLocaleTimeString(), 'started-server', 'The server is now started !');
  },

  /*
   * When a client joined a channel
   */
  onJoinedChannel: function (options) {
    console.log(new Date().toLocaleTimeString(), 'joined-channel', 'Socket ' + options.socket.id + ' joined channel ' + options.channel);
  },

  /*
   * When a client left a channel
   */
  onLeftChannel: function (options) {
    console.log(new Date().toLocaleTimeString(), 'left-channel', 'Socket ' + options.socket.id + ' left channel ' + options.channel);
  },

  /*
   * When a client is authenticating to a private channel
   */
  onAuthenticating: function (options) {
    console.log(new Date().toLocaleTimeString(), 'authenticating', 'Authenticating ...');
  },

  /*
   * When a client succeed to authenticate into a private channel
   */
  onAuthenticated: function (options) {
    console.log(new Date().toLocaleTimeString(), 'authenticated', 'Authenticated into channel ' + options.channel);
  },

  /*
   * When a client send a message
   */
  onSendingMessage: function (options) {
    console.log(new Date().toLocaleTimeString(), 'sending-message', 'Sending message ' + options.event + ' into channel ' + options.channel);
  },

  /*
   * When the server broadcast a message
   */
  onBroadcastingMessage: function (options) {
    console.log(new Date().toLocaleTimeString(), 'broadcasting-message', 'Broadcasting message (event ' + options.message.event + ') into channel ' + options.channel);
  }
};