"use strict";
let _ = require('lodash');
let io = require('socket.io');
let Redis = require('ioredis');
let request = require('request');
class EchoServer {
    constructor() {
        this._options = {
            host: 'http://localhost',
            port: 6001,
            authHost: null,
            authEndpoint: '/broadcasting/auth',
            socketEndpoint: '/broadcasting/socket'
        };
        this._privateChannels = ['private-*', 'presence-*'];
        this._redis = new Redis();
        this._redisPubSub = new Redis();
        this._io = io;
        this._request = request;
    }
    run(options) {
        this.options = _.merge(this._options, options);
        this.startSocketIoServer();
        this.redisPubSub();
        this.log("Servering at " + this.options.host + ":" + this.options.port);
    }
    startSocketIoServer() {
        this._io = io(this.options.port);
        this._io.on('connection', socket => {
            this.onSubscribe(socket);
            this.onDisconnect(socket);
        });
    }
    redisPubSub() {
        this._redisPubSub.psubscribe('*', (err, count) => { });
        this._redisPubSub.on('pmessage', (subscribed, channel, message) => {
            message = JSON.parse(message);
            this.handleSub(channel, message);
        });
    }
    handleSub(channel, message) {
        if (message.socket) {
            let socket = this._io.sockets.connected["/#" + message.socket];
            socket.broadcast.to(channel).emit(message.event, message.data);
        }
        else {
            this._io.to(channel).emit(message.event, message.data);
        }
    }
    onSubscribe(socket) {
        socket.on('subscribe', data => this.joinChannel(socket, data));
    }
    onDisconnect(socket) {
        socket.on('disconnect', () => { });
    }
    joinChannel(socket, data) {
        if (data.channel) {
            if (this.isPrivateChannel(data.channel)) {
                this.joinPrivateChannel(socket, data);
            }
            else {
                socket.join(data.channel);
            }
        }
    }
    joinPrivateChannel(socket, data) {
        this.channelAuthentication(socket, data).then(res => {
            let privateSocket = socket.join(data.channel);
            if (this.isPresenceChannel(data.channel) && res.channel_data) {
                let member = res.channel_data;
                member.socketId = socket.id;
                this.presenceChannelEvents(data.channel, privateSocket, member);
            }
        }, error => { }).then(() => this.sendSocketId(data, socket.id));
    }
    isPrivateChannel(channel) {
        let isPrivateChannel;
        this._privateChannels.forEach(privateChannel => {
            let regex = new RegExp(privateChannel.replace('\*', '.*'));
            if (regex.test(channel))
                isPrivateChannel = true;
        });
        return isPrivateChannel;
    }
    isPresenceChannel(channel) {
        return channel.lastIndexOf('presence-', 0) === 0;
    }
    getPresenceChannelMembers(channel) {
        return this.retrieve(channel + ':members');
    }
    addToPressence(channel, member) {
        this.getPresenceChannelMembers(channel).then(members => {
            members = members || [];
            members.push(member);
            members = _.uniqBy(members.reverse(), Object.keys(member)[0]);
            this.store(channel + ':members', members);
            this.emitPresenceEvents(channel, members, member, 'add');
        });
    }
    removeFromPresence(channel, socket_Id) {
        this.getPresenceChannelMembers(channel).then(members => {
            members = members || [];
            let member = _.find(members, ['socketId', socket_Id]);
            members = _.reject(members, member);
            this.store(channel + ':members', members);
            this.emitPresenceEvents(channel, members, member, 'remove');
        });
    }
    emitPresenceEvents(channel, members, member, action = null) {
        this._io.to(channel).emit('members:updated', members);
        if (action == 'add') {
            this._io.to(channel).emit('member:added', member);
        }
        else if (action == 'remove') {
            this._io.to(channel).emit('member:removed', member);
        }
    }
    presenceChannelEvents(channel, socket, member = null) {
        this.addToPressence(channel, member);
        socket.on('disconnect', () => this.removeFromPresence(channel, socket.id));
    }
    retrieve(key) {
        return new Promise((resolve, reject) => {
            this._redis.get(key).then(value => resolve(JSON.parse(value)));
        });
    }
    store(key, value) {
        this._redis.set(key, JSON.stringify(value));
    }
    getAuthHost() {
        return (this.options.authHost) ?
            this.options.authHost : this.options.host;
    }
    channelAuthentication(socket, data) {
        let options = {
            url: this.getAuthHost() + this.options.authEndpoint,
            form: { channel_name: data.channel },
            headers: (data.auth && data.auth.headers) ? data.auth.headers : {}
        };
        return this.severRequest(socket, options);
    }
    sendSocketId(data, socket) {
        let options = {
            url: this.getAuthHost() + this.options.socketEndpoint,
            form: { socket_id: socket.id },
            headers: (data.auth && data.auth.headers) ? data.auth.headers : {}
        };
        return this.severRequest(socket, options);
    }
    severRequest(socket, options) {
        return new Promise((resolve, reject) => {
            options.headers = this.prepareHeaders(socket, options);
            this._request.post(options, (error, response, body, next) => {
                if (!error && response.statusCode == 200) {
                    resolve(JSON.parse(response.body));
                }
                else {
                    this.log("Error: " + response.statusCode, 'error');
                    reject(false);
                }
            });
        });
    }
    prepareHeaders(socket, options) {
        options.headers['Cookie'] = socket.request.headers.cookie;
        return options.headers;
    }
    log(message, status = 'success') {
        if (status == 'success') {
            console.log("\x1b[32m%s\x1b[0m:", 'EchoServer', JSON.stringify(message));
        }
        else {
            console.log("\x1b[31m%s\x1b[0m:", '(Error)', JSON.stringify(message));
        }
    }
}
exports.EchoServer = EchoServer;
