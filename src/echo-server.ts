declare let require: any

let _ = require('lodash');
let io = require('socket.io')
let Redis = require('ioredis')
let request = require('request')

export class EchoServer {

  /**
   * Default server options.
   * @type {object}
   */
  private _options: any = {
    host: 'http://localhost',
    port: 6001,
    authEndpoint: '/broadcasting/auth',
    socketEndpoint: '/broadcasting/socket'
  };

  /**
   * Channels and patters for private channels.
   * @type {array}
   */
  protected _privateChannels: string[] = ['private-*', 'presence-*'];

  /**
   * Redis client
   * @type {object}
   */
  private _redis: any;

  /**
   * Redis pub client
   * @type {object}
   */
  private _redisPub: any;

  /**
   * Redis sub client
   * @type {object}
   */
  private _redisSub: any;

  /**
   * Socket.io client
   * @type {object}
   */
  private _io: any;

  /**
   * Request client
   * @type {object}
   */
  private _request: any;

  /**
   * Configurable server options
   * @type {object}
   */
  public options: any;

  /**
   * Constructor
   */
  constructor() {
    this._redis = new Redis();
    this._redisPub = new Redis();
    this._redisSub = new Redis();
    this._io = io;
    this._request = request;
  }

  /**
   * Start the Echo Server.
   * @param  {Object} config
   */
  run(options: any) {
    this.options = _.merge(this._options, options);
    this.startSocketIoServer();
    this.redisPubSub();

    this.log('Server running at ' + this.options.host + ':' + this.options.port);
  }

  /**
   * Start the Socket.io server.
   */
  startSocketIoServer() {
    this._io = io(this.options.port);
    this._io.on('connection', socket => {
      this.onSubscribe(socket);
      this.onDisconnect(socket);
    });
  }

  /**
   * Setup redis pub/sub.
   */
  redisPubSub() {
    this._redisSub.psubscribe('*', (err, count) => { });

    this._redisPub.on('pmessage', (subscribed, channel, message) => {
      message = JSON.parse(message);
      //this.log(message);
      this._io.to(channel).emit(message.event, message.data);
    });
  }

  /**
   * On subscribe to a channel
   * @param  {object}  socket
   */
  onSubscribe(socket: any) {
    socket.on('subscribe', data => {
      this.joinChannel(socket, data);
    });
  }

  /**
   * On disconnect from a channe,l
   * @param  {object}  socket
   */
  onDisconnect(socket: any) {
    socket.on('disconnect', () => { });
  }

  /**
   * Join a channel.
   * @param  {object} socket
   * @param  {data}  data
   */
  joinChannel(socket, data) {
    if (data.channel) {
      if (this.isPrivateChannel(data.channel)) {
        this.joinPrivateChannel(socket, data);
      } else {
        socket.join(data.channel);
      }
    }
  }

  /**
   * Join private channel, emit data to presence channels.
   * @param  {object} socket
   * @param  {object} data
   */
  joinPrivateChannel(socket, data) {
    this.channelAuthentication(data, socket).then(res => {
      res = JSON.parse(res);

      let privateSocket = socket.join(data.channel);

      if (this.isPresenceChannel(data.channel) && res.data && res.data.user) {
        this.addUserToPressenceChannel(data.channel, res.data.user);
        this.presenceChannelEvents(data.channel, privateSocket);
      }
    }, error => { }).then(() => {
      this.sendSocketId(data, socket.id);
    });
  }

  /**
   * Check if the incoming socket connection is a private channel.
   * @param  {string} channel
   * @return {boolean}
   */
  isPrivateChannel(channel: string) {
    let isPrivateChannel: boolean

    this._privateChannels.forEach(privateChannel => {
      let regex = new RegExp(privateChannel.replace('\*', '.*'));
      if (regex.test(channel)) isPrivateChannel = true;
    });

    return isPrivateChannel;
  }

  /**
   * Check if a channel is a private channel
   * @param  {string} channel
   * @return {boolean}
   */
  isPresenceChannel(channel: string) {
    return channel.lastIndexOf('presence-', 0) === 0;
  }

  /**
   * Get the users of a presence channel
   * @param  {string}  channel
   * @return {Promise}
   */
  getPresenceChannelUsers(channel: string): Promise<any> {
    return this._redis.get(channel + ':users');
  }

  /**
   * Set the presence channel users
   * @param  {string} channel
   * @param  {object}  user
   */
  addUserToPressenceChannel(channel: string, user: any) {
    this.getPresenceChannelUsers(channel).then(users => {
      users = (users) ? JSON.parse(users) : [];
      users.push(user)
      users = JSON.stringify(_.uniqBy(users, Object.keys(users)[0]));
      this._redis.set(channel + ':users', users);
      this.emitPresenceChannelUsers(channel, users);
      this.log(users);
    });
  }

  /**
   * Remove a user from a presenece channel
   * @param  {string} channel
   * @param  {object}  user
   */
  removeSocketFromPresenceChannel(channel: string, socket_Id: string) {
    this.getPresenceChannelUsers(channel).then(users => {
      users = (users) ? JSON.parse(users) : [];
      users = JSON.stringify(_.remove(users, user => {
        user.socket_id == socket_Id
      }));
      this._redis.set(channel + ':users', users);
      this.emitPresenceChannelUsers(channel, users);
    });
  }

  /**
   * Emit presence channel users to the channel
   * @param  {string} channel
   * @param  {array} users
   */
  emitPresenceChannelUsers(channel: string, users: string[]) {
    this._io.to(channel).emit('users:updated', users);
  }

  /**
   * Listen to events on private channel
   * @param  {string}  channel
   * @param  {object}  socket
   */
  presenceChannelEvents(channel: string, socket: any) {
    socket.on('disconnect', () => {
      this.removeSocketFromPresenceChannel(channel, socket.id);
    });
  }

  /**
   * Send authentication request to application server.
   * @param  {object} data
   * @param  {object} socket
   * @return {mixed}
   */
  protected channelAuthentication(data: any, socket: any) {
    let options = {
      url: this.options.host + this.options.authEndpoint,
      form: { channel_name: data.channel },
      headers: (data.auth && data.auth.headers) ? data.auth.headers : null
    };

    return this.severRequest(options);
  }

  /**
   * Send socket id to application server.
   * @param  {object} data
   * @param  {integer} socketId
   * @return {mixed}
   */
  protected sendSocketId(data: any, socketId: number) {
    let options = {
      url: this.options.host + this.options.socketEndpoint,
      form: { socket_id: socketId },
      headers: (data.auth && data.auth.headers) ? data.auth.headers : null
    };

    return this.severRequest(options);
  }

  /**
   * Send a request to the server.
   * @param  {object} options
   * @return {Promise}
   */
  protected severRequest(options: any) {
    return new Promise<any>((resolve, reject) => {
      this._request.post(options, (error, response, body, next) => {

        if ((!error && response.statusCode == 200)) {
          resolve(response.body);
        } else {
          this.log('Error: ' + response.statusCode, 'error');
          reject(false);
        }
      });
    });
  }

  /**
   * Console log a message with formating.
   * @param  {string} message
   * @param  {string} status
   */
  protected log(message: string, status: string = 'success') {
    if (status == 'success') {
      console.log('\x1b[32m%s\x1b[0m:', 'EchoServer', message);
    } else {
      console.log('\x1b[31m%s\x1b[0m:', '(Error)', message);
    }
  }
}
