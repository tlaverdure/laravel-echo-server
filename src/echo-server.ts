declare let require: any

let merge = require('lodash.merge');
let io = require('socket.io')
let Redis = require('ioredis')
let request = require('request')

export class EchoServer {
  /**
   * Default server options
   * @type {any}
   */
  private _options: any = {
    port: 6001,
    host: 'http://localhost',
    authEndpoint: '/broadcasting/auth'
  };

  /**
   * Channels and patters for private channels
   * @type {array}
   */
  protected _privateChannels: string[] = ['private-*', 'presence-*'];

  /**
   * Redis client
   * @type {object}
   */
  private _redis: any;

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
   * @type {any}
   */
  public options: any;

  /**
   * Constructor
   */
  constructor() {
    this._redis = new Redis();
    this._io = io;
    this._request = request;
  }

  /**
   * Start the Echo Server
   * @param  {Object} config
   */
  run(options: any) {
    this.options = merge(this._options, options);
    this.startSocketIoServer();
    this.redisPubSub();

    this.log('Server running at ' + this.options.host + ':' + this.options.port);
  }

  /**
   * Start the Socket.io server
   */
  startSocketIoServer() {
    this._io = io(this.options.port);
    this._io.on('connection', socket => {
      socket.on('join-channel', data => {
        this.joinChannel(socket, data);
      });
    });
  }

  /**
   * Setup redis pub sub
   */
  redisPubSub() {
    this._redis.psubscribe('*', (err, count) => { });

    this._redis.on('pmessage', (subscribed, channel, message) => {
      message = JSON.parse(message);
      this.log(message);
      this._io.to(channel).emit(message.event, message.data);
    });
  }

  /**
   * Join a channel
   * @param  {object} socket
   * @param  {data}   data
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
   * Join a private channel
   * @param  {object} socket
   * @param  {object} data
   */
  joinPrivateChannel(socket, data) {
    this.channelAuthentication(data).then(res => {
      socket.join(data.channel);
      // TODO: Send data back for presence channels
    }, error => {

    })
  }

  /**
   * Check if the incoming socket connection is a private channel
   * @param  {string} channel
   * @return {boolean}
   */
  isPrivateChannel(channel) {
    let isPrivateChannel: boolean

    this._privateChannels.forEach(privateChannel => {
      let regex = new RegExp(privateChannel.replace('\*', '.*'));
      if (regex.test(channel)) isPrivateChannel = true;
    });

    return isPrivateChannel;
  }

  /**
   * Send authentication request to application server
   * @param  {string} channel
   * @return {mixed}
   */
  private channelAuthentication(data) {
    let options = {
      url: this.options.host + this.options.authEndpoint,
      form: { channel_name: data.channel },
      headers: (data.auth && data.auth.headers) ? data.auth.headers : null
    };

    return new Promise<any>((resolve, reject) => {
      this._request.post(options, (error, response, body, next) => {
        if (error) {
          this.log(error, 'error');

          reject(error);
        }

        if ((!error && response.statusCode == 200)) {
          resolve(true);
        } else {
          this.log('Error: ' + response.statusCode, 'error');

          reject(false);
        }
      });
    });
  }

  /**
   * Console log a message
   * @param  {string} message
   * @param  {string} status
   */
  log(message: string, status: string = 'success') {
    if (status == 'success') {
      console.log('\x1b[32m%s\x1b[0m:', 'EchoServer', message);
    } else {
      console.log('\x1b[31m%s\x1b[0m:', '(Error)', message);
    }
  }
}
