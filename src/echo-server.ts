let _ = require('lodash');
let io = require('socket.io')
let Redis = require('ioredis')
let request = require('request')

/**
 * Echo server class.
 */
export class EchoServer {

    /**
     * Default server options.
     *
     * @type {object}
     */
    private _options: any = {
        host: 'http://localhost',
        port: 6001,
        authHost: null,
        authEndpoint: '/broadcasting/auth',
        socketEndpoint: '/broadcasting/socket'
    };

    /**
     * Channels and patters for private channels.
     *
     * @type {array}
     */
    protected _privateChannels: string[] = ['private-*', 'presence-*'];

    /**
     * Redis client.
     *
     * @type {object}
     */
    private _redis: any;

    /**
     * Redis pub/sub client.
     *
     * @type {object}
     */
    private _redisPubSub: any;

    /**
     * Socket.io client.
     *
     * @type {object}
     */
    private _io: any;

    /**
     * Request client.
     *
     * @type {object}
     */
    private _request: any;

    /**
     * Configurable server options.
     *
     * @type {object}
     */
    public options: any;

    /**
     * Create a new instance.
     */
    constructor() {
        this._redis = new Redis();
        this._redisPubSub = new Redis();
        this._io = io;
        this._request = request;
    }

    /**
     * Start the Echo Server.
     *
     * @param  {Object} config
     * @return {void}
     */
    run(options: any): void {
        this.options = _.merge(this._options, options);
        this.startSocketIoServer();
        this.redisPubSub();
        this.log("Servering at " + this.options.host + ":" + this.options.port);
    }

    /**
     * Start the Socket.io server.
     *
     * @return {void}
     */
    startSocketIoServer(): void {
        this._io = io(this.options.port);
        this._io.on('connection', socket => {
            this.onSubscribe(socket);
            this.onUnsubscribe(socket);
            this.onDisconnect(socket);
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
     * @param  {any}    message
     * @return {void}
     */
    handleSub(channel: string, message: any): void {
        if (message.socket) {
            let socket = this._io.sockets.connected["/#" + message.socket];
            socket.broadcast.to(channel).emit(message.event, message.data);
        } else {
            this._io.to(channel).emit(message.event, message.data);
        }
    }

    /**
     * On subscribe to a channel.
     *
     * @param  {object}  socket
     * @return {void}
     */
    onSubscribe(socket: any): void {
        socket.on('subscribe', data => this.joinChannel(socket, data));
    }

    /**
     * On unsubscribe from a channel.
     *
     * @param  {object} socket
     * @return {void}
     */
    onUnsubscribe(socket: any): void {
        socket.on('unsubscribe', data => this.leaveChannel(socket, data));
    }

    /**
     * On disconnect from a channel.
     *
     * @param  {object}  socket
     * @return {void}
     */
    onDisconnect(socket: any): void {
        socket.on('disconnect', () => { });
    }

    /**
     * Join a channel.
     *
     * @param  {object} socket
     * @param  {object}  data
     * @return {void}
     */
    joinChannel(socket: any, data: any): void {
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
     *
     * @param  {object} socket
     * @param  {object} data
     * @return {void}
     */
    joinPrivateChannel(socket: any, data: any): void {
        this.channelAuthentication(socket, data).then(res => {
            let privateSocket = socket.join(data.channel);

            if (this.isPresenceChannel(data.channel) && res.channel_data) {
                let member = res.channel_data;
                this.presenceChannelEvents(data.channel, privateSocket, member);
            }
        }, error => { });
    }

    /**
     * Leave a channel.
     *
     * @param  {object} socket
     * @param  {object} data
     * @return {void}
     */
    leaveChannel(socket: any, data: any): void {
        if (data.channel) {
            if (this.isPresenceChannel(data.channel)) {
                this.removeFromPresence(socket, data.channel)
            }

            socket.leave(data.channel);
        }
    }

    /**
     * Check if the incoming socket connection is a private channel.
     *
     * @param  {string} channel
     * @return {boolean}
     */
    isPrivateChannel(channel: string): boolean {
        let isPrivateChannel: boolean

        this._privateChannels.forEach(privateChannel => {
            let regex = new RegExp(privateChannel.replace('\*', '.*'));
            if (regex.test(channel)) isPrivateChannel = true;
        });

        return isPrivateChannel;
    }

    /**
     * Check if a channel is a private channel.
     *
     * @param  {string} channel
     * @return {boolean}
     */
    isPresenceChannel(channel: string): boolean {
        return channel.lastIndexOf('presence-', 0) === 0;
    }

    /**
     * Get the members of a presence channel.
     *
     * @param  {string}  channel
     * @return {Promise}
     */
    getPresenceChannelMembers(channel: string): Promise<any> {
        return this.retrieve(channel + ':members');
    }

    /**
     * Set the presence channel members.
     *
     * @param  {any} socket
     * @param  {string} channel
     * @param  {object}  member
     */
    addToPressence(socket: any, channel: string, member: any) {
        let newMember = member;
        newMember.socketId = socket.id;

        this.getPresenceChannelMembers(channel).then(members => {
            members = members || [];
            members.push(newMember);
            members = _.uniqBy(members.reverse(), Object.keys(member)[0]);

            this.store(channel + ':members', members);
            this.emitPresenceEvents(socket, channel, members, member, 'add');
        });
    }

    /**
     * Remove a member from a presenece channel.
     *
     * @param  {any} socket
     * @param  {string} channel
     * @return {void}
     */
    removeFromPresence(socket: any, channel: string): void {
        this.getPresenceChannelMembers(channel).then(members => {
            members = members || [];
            let member = _.find(members, ['socketId', socket.id]);
            members = _.reject(members, member);

            this.store(channel + ':members', members);
            this.emitPresenceEvents(socket, channel, members, member, 'remove');
        });
    }

    /**
     * Emit presence channel members to the channel.
     *
     * @param  {any} socket
     * @param  {string} channel
     * @param  {array} members
     * @return {void}
     */
    emitPresenceEvents(
        socket: any,
        channel: string,
        members: string[],
        member: string,
        action: string = null
    ): void {
        let currentSocket = this._io.sockets.connected[socket.id];

        if (action == 'add') {
            this._io.sockets.socket(socket.id).emit('presence:subscribed', members);
            currentSocket.broadcast.to(channel).emit('presence:joining', member);
        } else if (action == 'remove') {
            this._io.to(channel).emit('presence:leaving', member);
        }
    }

    /**
     * Listen to events on private channel.
     *
     * @param  {string}  channel
     * @param  {object}  socket
     * @return {void}
     */
    presenceChannelEvents(
        channel: string,
        socket: any,
        member: string = null
    ): void {
        this.addToPressence(socket, channel, member);
        socket.on('disconnect', () => this.removeFromPresence(socket, channel));
    }

    /**
     * Retrieve data from redis.
     *
     * @param  {string}  key
     * @return {Promise<any>}
     */
    protected retrieve(key: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this._redis.get(key).then(value => resolve(JSON.parse(value)));
        });
    }

    /**
     * Store data to redis.
     *
     * @param  {string} key
     * @param  {any}  value
     * @return {void}
     */
    protected store(key: string, value: any): void {
        this._redis.set(key, JSON.stringify(value));
    }

    /**
     * Get the auth endpoint.
     *
     * @return {string}
     */
    protected getAuthHost(): string {
        return (this.options.authHost) ?
            this.options.authHost : this.options.host;
    }

    /**
     * Send authentication request to application server.
     *
     * @param  {object} socket
     * @param  {object} data
     * @return {Promise<any>}
     */
    protected channelAuthentication(socket: any, data: any): Promise<any> {
        let options = {
            url: this.getAuthHost() + this.options.authEndpoint,
            form: { channel_name: data.channel },
            headers: (data.auth && data.auth.headers) ? data.auth.headers : {}
        };

        return this.severRequest(socket, options);
    }

    /**
     * Send a request to the server.
     *
     * @param  {object} socket
     * @param  {object} options
     * @return {Promise<any>}
     */
    protected severRequest(socket: any, options: any): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            options.headers = this.prepareHeaders(socket, options);

            this._request.post(options, (error, response, body, next) => {
                if (!error && response.statusCode == 200) {
                    resolve(JSON.parse(response.body));
                } else {
                    this.log(response.statusCode, 'error');

                    reject(false);
                }
            });
        });
    }

    /**
     * Prepare headers for request to app server.
     *
     * @param  {object} options
     * @return {any}
     */
    protected prepareHeaders(socket: any, options: any): any {
        options.headers['Cookie'] = socket.request.headers.cookie;

        return options.headers;
    }

    /**
     * Console log a message with formating.
     *
     * @param  {string|object} message
     * @param  {string} status
     * @return {void}
     */
    protected log(message: any, status: string = 'success'): void {
        if (status == 'success') {
            console.log("\x1b[32m%s\x1b[0m:", 'EchoServer', JSON.stringify(message));
        } else {
            console.log("\x1b[31m%s\x1b[0m:", '(Error)', JSON.stringify(message));
        }
    }
}
