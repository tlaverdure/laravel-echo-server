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
     * Event fired per socket/channel
     *
     * @type {Array}
     */
    protected events = [];

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
     * Create a new channel instance.
     */
    constructor(private io, private options) {
        this.private = new PrivateChannel(options);
        this.presence = new PresenceChannel(io, options);

        Log.success('Channels are ready.');
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
                this.onJoin(socket, data.channel);
            }
        }
    }

    /**
     * Leave a channel.
     *
     * @param  {object} socket
     * @param  {string} channel
     * @return {void}
     */
    leave(socket: any, channel: string): void {
        if (channel) {
            if (this.isPresence(channel)) {
                this.presence.leave(socket, channel)
            }

            socket.leave(channel);

            if (this.options.devMode) {
                Log.info(`[${new Date().toLocaleTimeString()}] - ${socket.id} left channel: ${channel}`);
            }
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
                this.presence.join(socket, data.channel, res.channel_data);
            }

            this.onJoin(socket, data.channel);
        }, error => Log.error(error));
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
     */
    onJoin(socket: any, channel: string): void {
        if (this.options.devMode) {
            Log.info(`[${new Date().toLocaleTimeString()}] - ${socket.id} joined channel: ${channel}`);
        }
    }
}
