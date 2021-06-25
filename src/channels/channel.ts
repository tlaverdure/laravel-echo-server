import { PresenceChannel } from './presence-channel';
import { PrivateChannel } from './private-channel';
import { Log } from './../log';

let request = require('request');
var fs = require('fs');

export class Channel {
    /**
     * Channels and patters for private channels.
     */
    protected _privateChannels: string[] = ['private-*', 'presence-*'];

    /**
     * Allowed client events
     */
    protected _clientEvents: string[] = ['client-*'];

    /**
     * Private channel instance.
     */
    private: PrivateChannel;

    /**
     * Presence channel instance.
     */
    presence: PresenceChannel;

    /**
     * Request client.
     *
     * @type {any}
     */
    private request: any;

    /**
     * Create a new channel instance.
     */
    constructor(private io, private options) {
        this.private = new PrivateChannel(options);
        this.presence = new PresenceChannel(io, options);
        this.request = request;

        if (this.options.devMode) {
            Log.success('Channels are ready.');
        }
    }

    /**
     * Join a channel.
     */
    join(socket, data): void {
        if (data.channel) {
            if (this.isPrivate(data.channel)) {
                this.joinPrivate(socket, data);
            } else {
                socket.join(data.channel);
                this.onJoin(socket, data);
            }
        }
    }

    /**
     * Trigger a client message
     */
    clientEvent(socket, data): void {
        try {
            data = JSON.parse(data);
        } catch (e) {
            data = data;
        }

        if (data.event && data.channel) {
            if (this.isClientEvent(data.event) &&
                this.isPrivate(data.channel) &&
                this.isInChannel(socket, data.channel)) {
                this.io.sockets.connected[socket.id]
                    .broadcast.to(data.channel)
                    .emit(data.event, data.channel, data.data);
            }
        }
    }

    /**
     * Leave a channel.
     */
    async leave(socket: any, data: any , reason: string): Promise<void> {
        const channel: string = data?.channel

        if (channel) {
            let user: any

            if (this.isPresence(channel)) {
                const member = await this.presence.leave(socket, channel)

                if (member !== undefined) {
                    user = member
                }
            }

            socket.leave(channel);

            if (this.options.devMode) {
                Log.info(`[${new Date().toISOString()}] - ${socket.id} left channel: ${channel} (${reason})`);
            }


            let payload: object = {
                user_id: user?.user_id,
                socket_id: socket.id
            }
            this.hook(socket, channel, data.auth, 'leave', payload)
        }
    }

    /**
     * Check if the incoming socket connection is a private channel.
     */
    isPrivate(channel: string): boolean {
        let isPrivate = false;

        this._privateChannels.forEach(privateChannel => {
            let regex = new RegExp(privateChannel.replace('\*', '.*'));
            if (regex.test(channel)) isPrivate = true;
        });

        return isPrivate;
    }

    /**
     * Join private channel, emit data to presence channels.
     */
    joinPrivate(socket: any, data: any): void {
        this.private.authenticate(socket, data).then(res => {
            socket.join(data.channel);

            if (this.isPresence(data.channel)) {
                var member = res.channel_data;
                try {
                    member = JSON.parse(res.channel_data);
                } catch (e) { }

                this.presence.join(socket, data.channel, member);
            }

            this.onJoin(socket, data, member);
        }, error => {
            if (this.options.devMode) {
                Log.error(error.reason);
            }

            this.io.sockets.to(socket.id)
                .emit('subscription_error', data.channel, error.status);
        });
    }

    /**
     * Check if a channel is a presence channel.
     */
    isPresence(channel: string): boolean {
        return channel.lastIndexOf('presence-', 0) === 0;
    }

    /**
     * On join a channel log success.
     */
    onJoin(socket: any, data: any, user: any = null): void {
        if (this.options.devMode) {
            Log.info(`[${new Date().toISOString()}] - ${socket.id} joined channel: ${data.channel}`);
        }

        let payload: object = {
            user_id: user?.user_id,
            socket_id: socket.id
        }
        this.hook(socket, data.channel, data.auth, 'join', payload)
    }

    /**
     * Check if client is a client event
     */
    isClientEvent(event: string): boolean {
        let isClientEvent = false;

        this._clientEvents.forEach(clientEvent => {
            let regex = new RegExp(clientEvent.replace('\*', '.*'));
            if (regex.test(event)) isClientEvent = true;
        });

        return isClientEvent;
    }

    /**
     * Check if a socket has joined a channel.
     */
    isInChannel(socket: any, channel: string): boolean {
        return !!socket.rooms[channel];
    }

    /**
     *
     * @param {any} socket
     * @param {string} channel
     * @param {object} auth
     * @param {string} event
     * @param {object} payload
     */
    hook(socket:any, channel: any, auth: object, event: string, payload: object) {
        if (typeof this.options.hookEndpoint == 'undefined' ||
            !this.options.hookEndpoint) {
            return;
        }

        let options = this.prepareHookHeaders(socket, auth, channel, event, payload);

        this.request.post(options, (error, response, body, next) => {
            if (error) {
                if (this.options.devMode) {
                    Log.error(`[${new Date().toLocaleTimeString()}] - Error call ${event} hook ${socket.id} for ${options.form.channel}`);
                }
                Log.error(error);
            } else if (response.statusCode !== 200) {
                if (this.options.devMode) {
                    Log.warning(`[${new Date().toLocaleTimeString()}] - Error call ${event} hook ${socket.id} for ${options.form.channel}`);
                    Log.error(response.body);
                }
            } else {
                if (this.options.devMode) {
                    Log.info(`[${new Date().toLocaleTimeString()}] - Call ${event} hook for ${socket.id} for ${options.form.channel}: ${response.body}`);
                }
            }
        });
    }

    /**
     * Prepare headers for request to app server.
     *
     * @param {any} socket
     * @param {any} auth
     * @param {string} channel
     * @param {string} event
     * @param {any} payload
     * @returns {any}
     */
    prepareHookHeaders(socket: any, auth: any, channel: string, event: string, payload: any): any {
        let options = {
            url: this.options.authHost + this.options.hookEndpoint,
            form: {
                event: event,
                channel: channel,
                payload: payload
            },
            headers: (auth && auth.headers) ? auth.headers : {}
        };

        if (this.options.authHost.indexOf('https')>-1 && this.options.sslCertPath && this.options.sslKeyPath) {
            options['agentOptions']= {
                cert: fs.readFileSync(this.options.sslCertPath),
                key: fs.readFileSync(this.options.sslKeyPath),
                passphrase: this.options.sslPassphrase
            };
            options['strictSSL']=false;
        }

        options.headers['Cookie'] = socket.request.headers.cookie;
        options.headers['X-Requested-With'] = 'XMLHttpRequest';
        return options;
    }
}
