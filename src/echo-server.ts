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
    this.channelAuthentication(socket, data).then(res => {
      res = JSON.parse(res);

      let privateSocket = socket.join(data.channel);

      if (this.isPresenceChannel(data.channel) && res.data && res.data.member) {
        this.addMemberToPressenceChannel(data.channel, res.data.member);
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
   * Get the memebers of a presence channel
   * @param  {string}  channel
   * @return {Promise}
   */
  getPresenceChannelMembers(channel: string): Promise<any> {
    return this._redis.get(channel + ':members');
  }

  /**
   * Set the presence channel members
   * @param  {string} channel
   * @param  {object}  member
   */
  addMemberToPressenceChannel(channel: string, member: any) {
    this.getPresenceChannelMembers(channel).then(memebers => {
      memebers = (memebers) ? JSON.parse(memebers) : [];
      memebers.push(member)
      memebers = JSON.stringify(_.uniqBy(memebers, Object.keys(memebers)[0]));
      this._redis.set(channel + ':memebers', memebers);
      this.emitPresenceChannelMembers(channel, memebers);
      this.log(memebers);
    });
  }

  /**
   * Remove a member from a presenece channel
   * @param  {string} channel
   * @param  {string_id}  socket_Id
   */
  removeSocketFromPresenceChannel(channel: string, socket_Id: string) {
    this.getPresenceChannelMembers(channel).then(memebers => {
      memebers = (memebers) ? JSON.parse(memebers) : [];
      memebers = JSON.stringify(_.remove(memebers, member => {
        member.socket_id == socket_Id
      }));
      this._redis.set(channel + ':members', memebers);
      this.emitPresenceChannelMembers(channel, memebers);
    });
  }

  /**
   * Emit presence channel memebers to the channel
   * @param  {string} channel
   * @param  {array} memebers
   */
  emitPresenceChannelMembers(channel: string, memebers: string[]) {
    this._io.to(channel).emit('memebers:updated', memebers);
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
   * @param  {object} socket
   * @param  {object} data
   * @return {mixed}
   */
  protected channelAuthentication(socket: any, data: any) {
    let options = {
      url: this.options.host + this.options.authEndpoint,
      form: { channel_name: data.channel },
      headers: (data.auth && data.auth.headers) ? data.auth.headers : null
    };

    return this.severRequest(socket, options);
  }

  /**
   * Send socket id to application server.
   * @param  {object} data
   * @param  {object} socketId
   * @return {mixed}
   */
  protected sendSocketId(data: any, socket: any) {
    let options = {
      url: this.options.host + this.options.socketEndpoint,
      form: { socket_id: socket.id },
      headers: (data.auth && data.auth.headers) ? data.auth.headers : null
    };

    return this.severRequest(socket, options);
  }

  /**
   * Send a request to the server.
   * @param  {object} socket
   * @param  {object} options
   * @return {Promise}
   */
  protected severRequest(socket: any, options: any) {
    return new Promise<any>((resolve, reject) => {
      options.headers = this.prepareHeaders(socket, options);

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
   * Prepare headers for request to app server
   * @param  {object} options
   * @return {object}
   */
  protected prepareHeaders(socket, options: any) {
    options.headers['Cookie'] = socket.request.headers.cookie;

    return options.headers;
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
