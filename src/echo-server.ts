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
        authHost: null,
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
     * Redis pub/sub client
     * @type {object}
     */
    private _redisPubSub: any;

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

        this._redisPubSub = new Redis();

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

        this.log("Servering at " + this.options.host + ":" + this.options.port);
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
        this._redisPubSub.psubscribe('*', (err, count) => { });

        this._redisPubSub.on('pmessage', (subscribed, channel, message) => {
            message = JSON.parse(message);

            this.handleSub(channel, message);
        });
    }

    /**
     * Handle subscribing to events and emitting to channels
     * @param  {string} channel
     * @param  {any}    message
     */
    handleSub(channel: string, message: any) {
        if (message.socket) {
            let socket = this._io.sockets.connected["/#" + message.socket];

            socket.broadcast.to(channel).emit(message.event, message.data);
        } else {
            this._io.to(channel).emit(message.event, message.data);
        }
    }

    /**
     * On subscribe to a channel
     * @param  {object}  socket
     */
    onSubscribe(socket: any) {
        socket.on('subscribe', data => this.joinChannel(socket, data));
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
     * @param  {object}  data
     */
    joinChannel(socket: any, data: any) {
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
    joinPrivateChannel(socket: any, data: any) {
        this.channelAuthentication(socket, data).then(res => {

            let privateSocket = socket.join(data.channel);

            if (this.isPresenceChannel(data.channel) && res.channel_data) {
                let member = res.channel_data;

                member.socketId = socket.id;

                this.presenceChannelEvents(data.channel, privateSocket, member);
            }
        }, error => { }).then(() => this.sendSocketId(data, socket.id));
    }

    /**
     * Check if the incoming socket connection is a private channel.
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
     * Check if a channel is a private channel
     * @param  {string} channel
     * @return {boolean}
     */
    isPresenceChannel(channel: string): boolean {
        return channel.lastIndexOf('presence-', 0) === 0;
    }

    /**
     * Get the members of a presence channel
     * @param  {string}  channel
     * @return {Promise}
     */
    getPresenceChannelMembers(channel: string): Promise<any> {
        return this.retrieve(channel + ':members');
    }

    /**
     * Set the presence channel members
     * @param  {string} channel
     * @param  {object}  member
     */
    addToPressence(channel: string, member: any) {
        this.getPresenceChannelMembers(channel).then(members => {
            members = members || [];

            members.push(member);

            members = _.uniqBy(members.reverse(), Object.keys(member)[0]);

            this.store(channel + ':members', members);

            this.emitPresenceEvents(channel, members, member, 'add');
        });
    }

    /**
     * Remove a member from a presenece channel
     * @param  {string} channel
     * @param  {string_id}  socket_Id
     */
    removeFromPresence(channel: string, socket_Id: string) {
        this.getPresenceChannelMembers(channel).then(members => {
            members = members || [];

            let member = _.find(members, ['socketId', socket_Id]);

            members = _.reject(members, member);

            this.store(channel + ':members', members);

            this.emitPresenceEvents(channel, members, member, 'remove');
        });
    }

    /**
     * Emit presence channel members to the channel
     * @param  {string} channel
     * @param  {array} members
     */
    emitPresenceEvents(
        channel: string,
        members: string[],
        member: string,
        action: string = null
    ) {
        this._io.to(channel).emit('members:updated', members);

        if (action == 'add') {
            this._io.to(channel).emit('member:added', member);
        } else if (action == 'remove') {
            this._io.to(channel).emit('member:removed', member);
        }
    }

    /**
     * Listen to events on private channel
     * @param  {string}  channel
     * @param  {object}  socket
     */
    presenceChannelEvents(
        channel: string,
        socket: any,
        member: string = null
    ) {
        this.addToPressence(channel, member);

        socket.on('disconnect', () => this.removeFromPresence(channel, socket.id));
    }

    /**
     * Retrieve data from redis
     * @param  {string}  key
     * @return {Promise}
     */
    protected retrieve(key: string): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this._redis.get(key).then(value => resolve(JSON.parse(value)));
        });
    }

    /**
     * Store data to redis
     * @param  {string} key
     * @param  {any}  value
     */
    protected store(key: string, value: any) {
        this._redis.set(key, JSON.stringify(value));
    }

    /**
     * Get the auth endpoint
     * @return {string}
     */
    protected getAuthHost(): string {
        return (this.options.authHost) ?
            this.options.authHost : this.options.host;
    }

    /**
     * Send authentication request to application server.
     * @param  {object} socket
     * @param  {object} data
     * @return {mixed}
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
     * Send socket id to application server.
     * @param  {object} data
     * @param  {object} socketId
     * @return {mixed}
     */
    protected sendSocketId(data: any, socket: any): Promise<any> {
        let options = {
            url: this.getAuthHost() + this.options.socketEndpoint,
            form: { socket_id: socket.id },
            headers: (data.auth && data.auth.headers) ? data.auth.headers : {}
        };

        return this.severRequest(socket, options);
    }

    /**
     * Send a request to the server.
     * @param  {object} socket
     * @param  {object} options
     * @return {Promise}
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
     * Prepare headers for request to app server
     * @param  {object} options
     * @return {object}
     */
    protected prepareHeaders(socket: any, options: any): any {
        options.headers['Cookie'] = socket.request.headers.cookie;

        return options.headers;
    }

    /**
     * Console log a message with formating.
     * @param  {string|object} message
     * @param  {string} status
     */
    protected log(message: any, status: string = 'success') {
        if (status == 'success') {
            console.log("\x1b[32m%s\x1b[0m:", 'EchoServer', JSON.stringify(message));
        } else {
            console.log("\x1b[31m%s\x1b[0m:", '(Error)', JSON.stringify(message));
        }
    }
}
