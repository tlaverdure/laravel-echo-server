import { Log } from './../log';
import { Subscriber } from './subscriber';

export class HttpSubscriber implements Subscriber {
    /**
     * Create new instance of http subscriber.
     *
     * @param  {any} http
     */
    constructor(private options, private http) { }

    /**
     * Subscribe to events to broadcast.
     *
     * @return {void}
     */
    subscribe(callback): void {
        this.http.on('request', (req, res) => {
            let body: any = [];

            if (req.method == 'POST' && req.url == '/broadcast') {
                if (req.headers.authorization != this.options.appKey) {
                    return this.unauthorizedResponse(req, res);
                }

                res.on('error', (error) => Log.error(error));
                req.on('data', (chunk) => body.push(chunk))
                    .on('end', () => this.handleData(req, res, body, callback));
            }
        });

        Log.success('Listening for http events...');
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

        res.write(JSON.stringify({ message: 'ok' }))
        res.end();
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
        res.write(JSON.stringify({ error: 'Unauthroized' }));
        res.end();

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
        res.write(JSON.stringify({ error: message }));
        res.end();

        return false;
    }
}
