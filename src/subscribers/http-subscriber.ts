import { Log } from './../log';
import { Subscriber } from './subscriber';
var url = require('url');

export class HttpSubscriber implements Subscriber {
    /**
     * Create new instance of http subscriber.
     *
     * @param  {any} express
     */
    constructor(private express) { }

    /**
     * Subscribe to events to broadcast.
     *
     * @return {void}
     */
    subscribe(callback): Promise<any> {
        return new Promise((resolve, reject) => {

            // Broadcast a message to a channel
            this.express.post('/broadcast', (req, res) => {
                let body: any = [];
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
