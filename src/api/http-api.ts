import { Log } from './../log';
var url = require('url');
var _ = require('lodash');

export class HttpApi {
    /**
     * Create new instance of http subscriber.
     *
     * @param  {any} io
     * @param  {any} channel
     * @param  {any} express
     */
    constructor(private io, private channel, private express) { }

    init() {
        // Get status info about the sockets and connections
        this.express.get('/status', (req, res) => {
            res.json({user_count: this.io.engine.clientsCount})
        })

        // The user count for all channels
        this.express.get('/apps/*/channels', (req, res) => {
            var prefix = url.parse(req.url, true).query.filter_by_prefix;

            var rooms = this.io.sockets.adapter.rooms;

            var channels = {};
            Object.keys(rooms).forEach(function (channelName) {
                // Skip rooms with the socket name
                if (rooms[channelName].sockets[channelName]) {
                    return;
                }

                // If filter is given, check if matches
                if (prefix && ! channelName.startsWith(prefix)) {
                    return;
                }

                channels[channelName] = {subscription_count: rooms[channelName].length, occupied: rooms[channelName].length > 0};
            });

            res.json({channels: channels});
        })

        // Get information about just 1 channel
        this.express.get('/apps/*/channels/:channelName', (req, res) => {
            var channelName = req.params.channelName;
            var room = this.io.sockets.adapter.rooms[channelName];
            var result = {subscription_count: room.length, occupied: room.length > 0};
            if ( this.channel.isPresence(channelName)) {
                this.channel.presence.getMembers(channelName).then(members => {
                    members = _.uniqBy(members, 'user_id');
                    result['user_count'] = members.length;
                    res.json(result);
                })
            } else {
                res.json(result);
            }
        })

        // Get information about just 1 channel
        this.express.get('/apps/*/channels/:channelName/users', (req, res) => {
            var channelName = req.params.channelName;
            if ( ! this.channel.isPresence(channelName)) {
                return this.badResponse(
                    req,
                    res,
                    'User list is only possible for Presence Channels'
                );
            }

            this.channel.presence.getMembers(channelName).then(members => {
                var users = [];
                _.uniqBy(members, 'user_id').forEach((member) => {
                    users.push({id: member.user_id});
                })
                res.json({users: users});
            }, error => Log.error(error));

        })
    }

    /**
     * Handle bad requests.
     *
     * @param  {any} req
     * @param  {any} res
     * @param  {string} message
     * @return {boolean}
     */
    badResponse(req: any, res: any, message: string): boolean {
        res.statusCode = 400;
        res.json({ error: message });

        return false;
    }
}
