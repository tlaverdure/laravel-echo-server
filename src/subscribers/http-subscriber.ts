import { Log } from './../log';
import { Subscriber } from './subscriber';
var url = require('url');

export class HttpSubscriber implements Subscriber {
    /**
     * Create new instance of http subscriber.
     *
     * @param  {any} io
     * @param  {any} channel
     * @param  {any} options
     * @param  {any} express
     */
    constructor(private io, private channel, private options, private express) { }

    /**
     * Subscribe to events to broadcast.
     *
     * @return {void}
     */
    subscribe(callback): Promise<any> {
        return new Promise((resolve, reject) => {

            // Get status info about the sockets and connections
            this.express.get('/status', (req, res) => {
                if (!this.canAccess(req)) {
                    return this.unauthorizedResponse(req, res);
                }

                res.json({user_count: this.io.engine.clientsCount})
            })

            // The user count for all channels
            this.express.get('/channels', (req, res) => {
                if (!this.canAccess(req)) {
                    return this.unauthorizedResponse(req, res);
                }

                var prefix = url.parse(req.url, true).query.filter_by_prefix

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
                if (!this.canAccess(req)) {
                    return this.unauthorizedResponse(req, res);
                }

                var room = this.io.sockets.adapter.rooms[req.params.channelName];
                res.json({user_count: room.length});
            })

            // Get information about just 1 channel
            this.express.get('/channels/:channelName/users', (req, res) => {
                if (!this.canAccess(req)) {
                    return this.unauthorizedResponse(req, res);
                }

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

            // Broadcast a message to a channel
            this.express.post('/broadcast', (req, res) => {
                let body: any = [];
                if (!this.canAccess(req)) {
                    return this.unauthorizedResponse(req, res);
                }

                res.on('error', (error) => {
                    Log.error(error);
                });

                req.on('data', (chunk) => body.push(chunk))
                    .on('end', () => this.handleData(req, res, body, callback));
            })


            Log.success('Listening for http events...');

            resolve();
        });
    }

    /**
     * Handle incoming event data.
     *
     * @param  {any} req
     * @param  {any} res
     * @param  {any} body
     * @param  {Function} broadcast
     * @return {boolean}
     */
    handleData(req, res, body, broadcast): boolean {
        body = JSON.parse(Buffer.concat(body).toString());

        if (body.channel && body.message) {
            if (!broadcast(body.channel, body.message)) {
                return this.badResponse(
                    req,
                    res,
                    `Could not broadcast to channel: ${body.channel}`
                );
            }
        } else {
            return this.badResponse(
                req,
                res,
                'Event must include channel and message'
            );
        }

        res.json({ message: 'ok' })
    }

    /**
     * Check is an incoming request can access the api.
     *
     * @param  {any} req
     * @return {boolean}
     */
    canAccess(req: any): boolean {
        let api_key = this.getApiToken(req);

        if (api_key) {
            let referrer = this.options.referrers.find((referrer) => {
                return referrer.apiKey == api_key;
            });

            if (referrer && (referrer.host == '*' ||
                referrer.host == req.headers.referer)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get the api token from the request.
     *
     * @param  {any} req
     * @return {string}
     */
    getApiToken(req: any): (string | boolean) {
        if (req.headers.authorization) {
            return req.headers.authorization.replace('Bearer ', '');
        }

        if (url.parse(req.url, true).query.api_key) {
            return url.parse(req.url, true).query.api_key
        }

        return false;

    }

    /**
     * Handle unauthoried requests.
     *
     * @param  {any} req
     * @param  {any} res
     * @return {boolean}
     */
    unauthorizedResponse(req: any, res: any): boolean {
        res.statusCode = 403;
        res.json({ error: 'Unauthorized' });

        return false;
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
