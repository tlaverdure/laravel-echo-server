"use strict";
let _ = require('lodash');
let io = require('socket.io');
let Redis = require('ioredis');
let request = require('request');
class EchoServer {
    constructor() {
        this._options = {
            port: 6001,
            host: 'http://localhost',
            authEndpoint: '/broadcasting/auth'
        };
        this._privateChannels = ['private-*', 'presence-*'];
        this._redis = new Redis();
        this._redisPub = new Redis();
        this._redisSub = new Redis();
        this._io = io;
        this._request = request;
    }
    run(options) {
        this.options = _.merge(this._options, options);
        this.startSocketIoServer();
        this.redisPubSub();
        this.log('Server running at ' + this.options.host + ':' + this.options.port);
    }
    startSocketIoServer() {
        this._io = io(this.options.port);
        this._io.on('connection', socket => {
            this.onSubscribe(socket);
            this.onDisconnect(socket);
        });
    }
    redisPubSub() {
        this._redisSub.psubscribe('*', (err, count) => { });
        this._redisPub.on('pmessage', (subscribed, channel, message) => {
            message = JSON.parse(message);
            this._io.to(channel).emit(message.event, message.data);
        });
    }
    onSubscribe(socket) {
        socket.on('subscribe', data => {
            this.joinChannel(socket, data);
        });
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
        this.channelAuthentication(data).then(res => {
            res = JSON.parse(res);
            let privateSocket = socket.join(data.channel);
            if (res.data && res.data.user) {
                this.addUserToPressenceChannel(data.channel, res.data.user);
                this.presenceChannelEvents(data.channel, privateSocket);
            }
        }, error => { });
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
    getPresenceChannelUsers(channel) {
        return this._redis.get(channel + ':users');
    }
    addUserToPressenceChannel(channel, user) {
        this.getPresenceChannelUsers(channel).then(users => {
            users = (users) ? JSON.parse(users) : [];
            users.push(user);
            users = JSON.stringify(_.uniqBy(users, Object.keys(users)[0]));
            this._redis.set(channel + ':users', users);
            this.emitPresenceChannelUsers(channel, users);
            this.log(users);
        });
    }
    removeSocketFromPresenceChannel(channel, socket_Id) {
        this.getPresenceChannelUsers(channel).then(users => {
            users = (users) ? JSON.parse(users) : [];
            users = JSON.stringify(_.remove(users, user => {
                user.socket_id == socket_Id;
            }));
            this._redis.set(channel + ':users', users);
            this.emitPresenceChannelUsers(channel, users);
        });
    }
    emitPresenceChannelUsers(channel, users) {
        this._io.to(channel).emit('users:updated', users);
    }
    presenceChannelEvents(channel, socket) {
        socket.on('disconnect', () => {
            this.removeSocketFromPresenceChannel(channel, socket.id);
        });
    }
    channelAuthentication(data) {
        let options = {
            url: this.options.host + this.options.authEndpoint,
            form: { channel_name: data.channel },
            headers: (data.auth && data.auth.headers) ? data.auth.headers : null
        };
        return this.channelAuthenticationRequest(options);
    }
    channelAuthenticationRequest(options) {
        return new Promise((resolve, reject) => {
            this._request.post(options, (error, response, body, next) => {
                if (error) {
                    this.log(error, 'error');
                    reject(error);
                }
                if ((!error && response.statusCode == 200)) {
                    resolve(response.body);
                }
                else {
                    this.log('Error: ' + response.statusCode, 'error');
                    reject(false);
                }
            });
        });
    }
    log(message, status = 'success') {
        if (status == 'success') {
            console.log('\x1b[32m%s\x1b[0m:', 'EchoServer', message);
        }
        else {
            console.log('\x1b[31m%s\x1b[0m:', '(Error)', message);
        }
    }
}
exports.EchoServer = EchoServer;
