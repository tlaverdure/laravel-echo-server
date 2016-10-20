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
        this.options = options;

        Log.success('Channels are ready.');
    }

    /**
     * Join a channel.
     *
     * @param  {object} socket
     * @param  {object} data
     * @param  {Function} callback
     * @return {void}
     */
    join(socket, data, callback?: Function): void {
        if (data.channel) {
            if (this.isPrivate(data.channel)) {
                this.joinPrivate(socket, data, callback);
            } else {
                if (this.options.verbose) {
                    Log.success(socket.id + " joined public channel " + data.channel);
                }
                socket.join(data.channel);
                if (typeof callback === 'function') {
                    callback(data.channel, socket);
                }
            }
        }

        this.onDisconnect(socket, data.channel);
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
     * @param  {Function} callback
     * @return {void}
     */
    joinPrivate(socket: any, data: any, callback?: Function): void {
        if (this.options.verbose) {
            Log.info(socket.id + " attempting to join private channel " + data.channel);
        }
        this.private.authenticate(socket, data).then(res => {
            if (this.options.verbose) {
                Log.success(socket.id + " successfully authenticated on channel " + data.channel);
            }
            socket.join(data.channel);
            if (typeof callback === 'function') {
                callback(data.channel, socket);
            }

            if (this.isPresence(data.channel)) {
                this.presence.join(socket, data.channel, res.channel_data);
            }
        }, error => {
            Log.error(error)
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
     * On disconnect from a channel.
     *
     * @param  {object}  socket
     * @return {void}
     */
    onDisconnect(socket: any, channel: string): void {
        socket.on('disconnect', () => this.leave(socket, channel));
    }
}
