import { HttpSubscriber, RedisSubscriber } from './subscribers';
import { Channel } from './channels';
import { Server } from './server';
import { HttpApi } from './api';
import { Log } from './log';
import * as fs from 'fs';
const packageFile = require('../package.json');

/**
 * Echo server class.
 */
export class EchoServer {
    /**
     * Default server options.
     *
     * @type {object}
     */
    public defaultOptions: any = {
        authHost: 'http://localhost',
        authEndpoint: '/broadcasting/auth',
        clients: [],
        database: 'redis',
        databaseConfig: {
            redis: {},
            sqlite: {
                databasePath: '/database/laravel-echo-server.sqlite'
            }
        },
        devMode: false,
        host: null,
        port: 6001,
        protocol: "http",
        socketio: {},
        sslCertPath: '',
        sslKeyPath: '',
        sslCertChainPath: '',
        sslPassphrase: '',
        apiOriginAllow: {
            allowCors: false,
            allowOrigin: '',
            allowMethods: '',
            allowHeaders: ''
        }
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
     * Channel instance.
     *
     * @type {Channel}
     */
    private channel: Channel;

    /**
     * Redis subscriber instance.
     *
     * @type {RedisSubscriber}
     */
    private redisSub: RedisSubscriber;

    /**
     * Http subscriber instance.
     *
     * @type {HttpSubscriber}
     */
    private httpSub: HttpSubscriber;

    /**
     * Http api instance.
     *
     * @type {HttpApi}
     */
    private httpApi: HttpApi;

    /**
     * Create a new instance.
     */
    constructor() { }

    /**
     * Start the Echo Server.
     *
     * @param  {Object} config
     * @return {Promise}
     */
    run(options: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.options = Object.assign(this.defaultOptions, options);
            this.startup();
            this.server = new Server(this.options);

            this.server.init().then(io => {
                this.init(io).then(() => {
                    Log.info('\nServer ready!\n');
                    resolve(this);
                }, error => Log.error(error));
            }, error => Log.error(error));
        });
    }

    /**
     * Initialize the class
     *
     * @param {any} io
     */
    init(io: any): Promise<any> {
        return new Promise((resolve, reject) => {
            this.channel = new Channel(io, this.options);
            this.redisSub = new RedisSubscriber(this.options);
            this.httpSub = new HttpSubscriber(this.server.express, this.options);
            this.httpApi = new HttpApi(io, this.channel, this.server.express, this.options.apiOriginAllow);
            this.httpApi.init();

            this.onConnect();
            this.listen().then(() => resolve(), err => Log.error(err));
        });
    }

    /**
     * Text shown at startup.
     *
     * @return {void}
     */
    startup(): void {
        Log.title(`\nL A R A V E L  E C H O  S E R V E R\n`);
        Log.info(`version ${packageFile.version}\n`);

        if (this.options.devMode) {
            Log.warning('Starting server in DEV mode...\n');
        } else {
            Log.info('Starting server...\n')
        }
    }

    /**
     * Listen for incoming event from subscibers.
     *
     * @return {void}
     */
    listen(): Promise<any> {
        return new Promise((resolve, reject) => {
            let http = this.httpSub.subscribe((channel, message) => {
                return this.broadcast(channel, message);
            });

            let redis = this.redisSub.subscribe((channel, message) => {
                return this.broadcast(channel, message);
            });

            Promise.all([http, redis]).then(() => resolve());
        });
    }

    /**
     * Return a channel by its socket id.
     *
     * @param  {string} socket_id
     * @return {any}
     */
    find(socket_id: string): any {
        return this.server.io.sockets.connected[socket_id];
    }

    /**
     * Broadcast events to channels from subscribers.
     *
     * @param  {string} channel
     * @param  {any} message
     * @return {void}
     */
    broadcast(channel: string, message: any): boolean {
        if (message.socket && this.find(message.socket)) {
            return this.toOthers(this.find(message.socket), channel, message);
        } else {
            return this.toAll(channel, message);
        }
    }

    /**
     * Broadcast to others on channel.
     *
     * @param  {any} socket
     * @param  {string} channel
     * @param  {any} message
     * @return {boolean}
     */
    toOthers(socket: any, channel: string, message: any): boolean {
        socket.broadcast.to(channel)
            .emit(message.event, channel, message.data);

        return true
    }

    /**
     * Broadcast to all members on channel.
     *
     * @param  {any} socket
     * @param  {string} channel
     * @param  {any} message
     * @return {boolean}
     */
    toAll(channel: string, message: any): boolean {
        this.server.io.to(channel)
            .emit(message.event, channel, message.data);

        return true
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
            this.onDisconnecting(socket);
            this.onClientEvent(socket);
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
            this.channel.join(socket, data);
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
            this.channel.leave(socket, data.channel, 'unsubscribed');
        });
    }

    /**
     * On socket disconnecting.
     *
     * @return {void}
     */
    onDisconnecting(socket: any): void {
        socket.on('disconnecting', (reason) => {
            Object.keys(socket.rooms).forEach(room => {
                if (room !== socket.id) {
                    this.channel.leave(socket, room, reason);
                }
            });
        });
    }

    /**
     * On client events.
     *
     * @param  {object} socket
     * @return {void}
     */
    onClientEvent(socket: any): void {
        socket.on('client event', data => {
            this.channel.clientEvent(socket, data);
        });
    }
}
