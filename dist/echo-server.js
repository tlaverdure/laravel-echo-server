"use strict";
let merge = require('lodash.merge');
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
        this._io = io;
        this._request = request;
    }
    run(options) {
        this.options = merge(this._options, options);
        this.startSocketIoServer();
        this.redisPubSub();
        this.log('Server running at ' + this.options.host + ':' + this.options.port);
    }
    startSocketIoServer() {
        this._io = io(this.options.port);
        this._io.on('connection', socket => {
            socket.on('join-channel', data => {
                this.joinChannel(socket, data);
            });
        });
    }
    redisPubSub() {
        this._redis.psubscribe('*', (err, count) => { });
        this._redis.on('pmessage', (subscribed, channel, message) => {
            message = JSON.parse(message);
            this.log(message);
            this._io.to(channel).emit(message.event, message.data);
        });
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
            socket.join(data.channel);
        }, error => {
        });
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
    channelAuthentication(data) {
        let options = {
            url: this.options.host + this.options.authEndpoint,
            form: { channel_name: data.channel },
            headers: (data.auth && data.auth.headers) ? data.auth.headers : null
        };
        return new Promise((resolve, reject) => {
            this._request.post(options, (error, response, body, next) => {
                if (error) {
                    this.log(error, 'error');
                    reject(error);
                }
                if ((!error && response.statusCode == 200)) {
                    resolve(true);
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
