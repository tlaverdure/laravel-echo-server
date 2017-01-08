import { Log } from './../log';
var url = require('url');

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
        this.express.get('/channels', (req, res) => {
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

                channels[channelName] = {user_count: rooms[channelName].length};
            });

            res.json({channels: channels});
        })

        // Get information about just 1 channel
        this.express.get('/channels/:channelName', (req, res) => {
            var room = this.io.sockets.adapter.rooms[req.params.channelName];
            res.json({user_count: room.length});
        })

        // Get information about just 1 channel
        this.express.get('/channels/:channelName/users', (req, res) => {
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
                members.forEach((member) => {
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
