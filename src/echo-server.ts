import { HttpSubscriber, RedisSubscriber } from './subscribers';
import { Channel } from './channels';
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
    public defaultOptions: any = {
        appKey: '',
        authHost: null,
        authEndpoint: '/broadcasting/auth',
        database: 'redis',
        databaseConfig: {
            redis: {},
            sqlite: {
                databasePath: '/database/laravel-echo-server.sqlite'
            }
        },
        devMode: false,
        host: 'http://localhost',
        port: 6001,
        referrers: [],
        socketio: {},
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
     * @type {boolean}
     */
    private redisReady: boolean = false;

    /**
     * @type {boolean}
     */
    private httpReady: boolean = false;

    /**
     * @type {boolean}
     */
    private ioReady: boolean = false;

    /**
     * Create a new instance.
     */
    constructor() { }

    /**
     * Start the Echo Server.
     *
     * @param  {Object} config
     * @return {void}
     */
    run(options: any): void {
        this.options = Object.assign(this.defaultOptions, options);
        this.startup();
        this.server = new Server(this.options);

        this.server.init().then(io => {
            this.init(io).then(() => {
                this.ioReady = true;
                this.onComponentReady();
            }, error => Log.error(error));
        }, error => Log.error(error));
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
            this.httpSub = new HttpSubscriber(this.options, this.server.http);

            this.listen();
            this.addConnectListener();

            resolve();
        });
    }

    /**
     * Text shown at startup.
     *
     * @return {void}
     */
    startup(): void {
        Log.title(`\nL A R A V E L  E C H O  S E R V E R\n`);

        if (this.options.devMode) {
            Log.info('Starting server in DEV mode...\n');
            Log.success('Dev mode activated.');
        } else {
            Log.info('Starting server...\n')
        }
    }

    /**
     * Called when each stage of the startup process completes.
     *
     * @return {void}
     */
    onComponentReady(): void {
        if (this.isReady()) {
            Log.info('\nServer ready!\n');
        }
    }

    /**
     * Check if all the listeners are up and running and we're good to go.
     *
     * @returns {boolean}
     */
    isReady(): boolean {
        return this.redisReady && this.httpReady && this.ioReady;
    }

    /**
     * Listen for incoming event from subscibers.
     *
     * @return {void}
     */
    listen(): void {
        this.redisSub.subscribe(
            (channel, message) => {
                return this.broadcast(channel, message);
            },
            (subscriber) => {
                this.redisReady = true;
                this.onComponentReady();
            }
        );

        this.httpSub.subscribe(
            (channel, message) => {
                return this.broadcast(channel, message);
            },
            (subscriber) => {
                this.httpReady = true;
                this.onComponentReady();
            }
        );
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
    addConnectListener(): void {
        this.server.io.on('connection', socket => {
            this.addSubscribeListener(socket);
            this.addUnsubscribeListener(socket);
        });
    }

    /**
     * On subscribe to a channel.
     *
     * @param  {object} socket
     * @return {void}
     */
    addSubscribeListener(socket: any): void {
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
    addUnsubscribeListener(socket: any): void {
        socket.on('unsubscribe', data => {
            this.channel.leave(socket, data.channel);
        });
    }
}
