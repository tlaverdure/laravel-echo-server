var _ = require('lodash');
import { Channel } from './channel';
import { Cache } from './cache';
import { Log } from './log';

export class PresenceChannel {
    /**
     * Cache instance.
     *
     * @type {any}
     */
    cache: any;

    /**
     * Create a new Presence channel instance.
     *
     * @param  {any} options
     * @param  {string} channel
     * @param  {string} member
     */
    constructor(private io, private options: any) {
        this.cache = new Cache();
    }

    /**
     * Get the members of a presence channel.
     *
     * @param  {string}  channel
     * @return {Promise}
     */
    getMembers(channel: string): Promise<any> {
        return this.cache.get(channel + ':members');
    }

    /**
     * Check if a user is on a presence channel.
     *
     * @param  {string}  channel
     * @param  {any} member
     * @return {boolean}
     */
    isMember(channel: string, member: any): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.getMembers(channel).then(members => {
                this.removeInactive(channel, members, member).then((members: any) => {
                    let search = members.filter(m => m.user_id == member.user_id);

                    if (search && search.length) {
                        resolve(true);
                    }

                    resolve(false);
                });
            });
        });
    }

    /**
     * Remove inactive channel members from the presence channel.
     *
     * @param  {string} channel
     * @param  {any[]} members
     * @param  {[any]} member
     * @return {[type]}
     */
    removeInactive(channel: string, members: any[], member: any) {
        return new Promise((resolve, reject) => {
            this.io.of('/').in(channel).clients((error, clients) => {
                members = members.filter(member => {
                    return clients.indexOf(member.socketId) >= 0;
                });

                this.cache.store(channel + ':members', members);

                resolve(members)
            });
        });
    }

    /**
     * Join a presence channel and emit that they have joined only if it is the
     * first instance of their presence.
     *
     * @param  {any} socket
     * @param  {string} channel
     * @param  {object}  member
     */
    join(socket: any, channel: string, member: any) {
        this.isMember(channel, member).then(is_member => {
            this.getMembers(channel).then(members => {
                members = members || [];
                member.socketId = socket.id;
                members.push(member);

                this.cache.store(channel + ':members', members);

                members = _.uniqBy(members.reverse(), 'user_id');
                this.onSubscribed(socket, members);

                if (!is_member) {
                    this.onJoin(socket, channel, member);
                }
            });

        }, () => {
            Log.error('Error retrieving pressence channel members.');
        });
    }

    /**
     * Remove a member from a presenece channel and broadcast they have left
     * only if not other presence channel instances exist.
     *
     * @param  {any} socket
     * @param  {string} channel
     * @return {void}
     */
    leave(socket: any, channel: string): void {
        this.getMembers(channel).then(members => {
            members = members || [];
            let member = members.find(member => member.socketId == socket.id);
            members = members.filter(m => m.socketId != member.socketId);

            this.cache.store(channel + ':members', members);

            this.isMember(channel, member).then(is_member => {
                if (!is_member) {
                    delete member.socketId;
                    this.onLeave(channel, member);
                }
            });
        });
    }

    /**
     * On join event handler.
     *
     * @param  {any} socket
     * @param  {string} channel
     * @param  {any} member
     * @return {void}
     */
    onJoin(socket: any, channel: string, member: any): void {
        this.io
            .sockets
            .connected[socket.id]
            .broadcast
            .to(channel)
            .emit('presence:joining', member);
    }

    /**
     * On leave emitter.
     *
     * @param  {string} channel
     * @param  {member} member
     * @return {void}
     */
    onLeave(channel: string, member: any): void {
        this.io
            .to(channel)
            .emit('presence:leaving', member);
    }

    /**
     * On subscribed event emitter.
     *
     * @param  {string} channel
     * @param  {member} member
     * @return {void}
     */
    onSubscribed(socket, members) {
        this.io
            .to(socket.id)
            .emit('presence:subscribed', members);
    }
}
