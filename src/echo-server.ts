var _ = require('lodash');
var Redis = require('ioredis');

import { Channel } from './channel';
import { Server } from './server';
import { Log } from './log';

/**
 * Echo server class.
 */
export class EchoServer {
    /**
     * Default server options.
     *
     * @type {object}
     */
    private _defaultOptions: any = {
        authHost: null,
        authEndpoint: '/broadcasting/auth',
        hostname: 'http://localhost',
        port: 6001,
        sslCertPath: '',
        sslKeyPath: ''
    };

    /**
     * Configurable server options.
     *
     * @type {object}
     */
    public options: any;

    /**
     * Socket.io server instance.
     *
     * @type {Server}
     */
    private server: Server;

    /**
     * Redis pub/sub client.
     *
     * @type {object}
     */
    private _redisPubSub: any;

    channel: any;

    /**
     * Create a new instance.
     */
    constructor() {
        this._redisPubSub = new Redis();
    }

    /**
     * Start the Echo Server.
     *
     * @param  {Object} config
     * @return {void}
     */
    run(options: any): void {
        this.options = Object.assign(this._defaultOptions, options);
        this.server = new Server(this.options);

        this.server.init().then(io => {
            this.channel = new Channel(io, this.options);
            this.redisPubSub();
            this.onConnect();
        });
    }

    /**
     * Setup redis pub/sub.
     *
     * @return {void}
     */
    redisPubSub(): void {
        this._redisPubSub.psubscribe('*', (err, count) => { });
        this._redisPubSub.on('pmessage', (subscribed, channel, message) => {
            message = JSON.parse(message);
            this.handleSub(channel, message);
        });
    }

    /**
     * Handle subscribing to events and emitting to channels.
     *
     * @param  {string} channel
     * @param  {any} message
     * @return {void}
     */
    handleSub(channel: string, message: any): void {
        if (message.socket) {
            let socket = this.server.io
                .sockets
                .connected["/#" + message.socket];

            socket.broadcast.to(channel).emit(message.event, message.data);
        } else {
            this.server.io.to(channel).emit(message.event, message.data);
        }
    }

    /**
     * On server connection.
     *
     * @return {void}
     */
    onConnect(): void {
        this.server.io.on('connection', socket => {
            this.onSubscribe(socket);
            this.onUnsubscribe(socket);
        });
    }

    /**
     * On subscribe to a channel.
     *
     * @param  {object} socket
     * @return {void}
     */
    onSubscribe(socket: any): void {
        socket.on('subscribe', data => {
            this.channel.join(socket, data)
        });
    }

    /**
     * On unsubscribe from a channel.
     *
     * @param  {object} socket
     * @return {void}
     */
    onUnsubscribe(socket: any): void {
        socket.on('unsubscribe', data => {
            this.channel.leave(socket, data.channel)
        });
    }
}
