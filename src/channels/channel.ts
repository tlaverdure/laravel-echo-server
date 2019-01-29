let request = require('request');
import { PresenceChannel } from './presence-channel';
import { PrivateChannel } from './private-channel';
import { Log } from './../log';

export class Channel {
    /**
     * Channels and patters for private channels.
     *
     * @type {array}
     */
    protected _privateChannels: string[] = ['private-*', 'presence-*'];

    /**
     * Allowed client events
     *
     * @type {array}
     */
    protected _clientEvents: string[] = ['client-*'];

    /**
     * Private channel instance.
     *
     * @type {PrivateChannel}
     */
    private: PrivateChannel;

    /**
     * Presence channel instance.
     *
     * @type {PresenceChannel}
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
     *
     * @param  {object} socket
     * @param  {object} data
     * @return {void}
     */
    join(socket, data): void {
        if (data.channel) {
            if (this.isPrivate(data.channel)) {
                this.joinPrivate(socket, data);
            } else {
                socket.join(data.channel);
                this.onJoin(socket, data.channel, data.auth);
            }
        }
    }

    /**
     * Trigger a client message
     *
     * @param  {object} socket
     * @param  {object} data
     * @return {void}
     */
    clientEvent(socket, data): void {
        if (data.event && data.channel) {
            if (this.isClientEvent(data.event) &&
                this.isPrivate(data.channel) &&
                this.isInChannel(socket, data.channel)) {
                this.io.sockets.connected[socket.id]
                    .broadcast.to(data.channel)
                    .emit(data.event, data.channel, data.data);
                this.hook(socket, data.channel, data.auth, "client_event", data.data);
            }
        }
    }

    /**
     * Leave a channel.
     *
     * @param  {object} socket
     * @param  {string} channel
     * @param  {string} reason
     * @param  {object} auth
     * @return {void}
     */
    leave(socket: any, channel: string, reason: string, auth: any): void {
        if (channel) {
            if (this.isPresence(channel)) {
                this.presence.leave(socket, channel)
            }

            socket.leave(channel);

            if (this.options.devMode) {
                Log.info(`[${new Date().toLocaleTimeString()}] - ${socket.id} left channel: ${channel} (${reason})`);
            }

            this.hook(socket, channel, auth, "leave", null);
        }
    }

    /**
     * Check if the incoming socket connection is a private channel.
     *
     * @param  {string} channel
     * @return {boolean}
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
     *
     * @param  {object} socket
     * @param  {object} data
     * @return {void}
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

            this.onJoin(socket, data.channel, data.auth);
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
     *
     * @param  {string} channel
     * @return {boolean}
     */
    isPresence(channel: string): boolean {
        return channel.lastIndexOf('presence-', 0) === 0;
    }

    /**
     * On join a channel log success.
     *
     * @param {any} socket
     * @param {string} channel
     * @param {any} auth
     */
    onJoin(socket: any, channel: string, auth: any): void {
        if (this.options.devMode) {
            Log.info(`[${new Date().toLocaleTimeString()}] - ${socket.id} joined channel: ${channel}`);
        }

        this.hook(socket, channel, auth, "join", null);
    }

    /**
     * Check if client is a client event
     *
     * @param  {string} event
     * @return {boolean}
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
     *
     * @param socket
     * @param channel
     * @returns {boolean}
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
    hook(socket:any, channel: any, auth: any, event: string, payload: object) {
        if (typeof this.options.hookEndpoint == 'undefined' ||
            !this.options.hookEndpoint) {
            return;
        }

        let hookEndpoint = this.options.hookEndpoint;

        let options = this.prepareHookHeaders(socket, auth, channel, hookEndpoint, event, payload)

        this.request.post(options, (error, response, body, next) => {
            if (error) {
                if (this.options.devMode) {
                    Log.error(`[${new Date().toLocaleTimeString()}] - Error call ${event} hook ${socket.id} for ${options.form.channel_name}`);
                }

                Log.error(error);
            } else if (response.statusCode !== 200) {
                if (this.options.devMode) {
                    Log.warning(`[${new Date().toLocaleTimeString()}] - Error call ${event} hook ${socket.id} for ${options.form.channel_name}`);
                    Log.error(response.body);
                }
            } else {
                if (this.options.devMode) {
                    Log.info(`[${new Date().toLocaleTimeString()}] - Call ${event} hook for ${socket.id} for ${options.form.channel_name}: ${response.body}`);
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
     * @param {string} hookEndpoint
     * @param {string} event
     * @param {any} payload
     * @returns {any}
     */
    prepareHookHeaders(socket: any, auth: any, channel: string, hookEndpoint: string, event: string, payload: any): any {
        let hookHost = this.options.hookHost ? this.options.hookHost : this.options.authHost
        let options = {
            url: hookHost + hookEndpoint,
            form: { 
                event: event,
                channel: channel, 
                payload: payload 
            },
            headers: (auth && auth.headers) ? auth.headers : {}
        };
        
        options.headers['Cookie'] = socket.request.headers.cookie;
        options.headers['X-Requested-With'] = 'XMLHttpRequest';
        return options;
    }
}
