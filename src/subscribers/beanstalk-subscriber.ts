const { Consumer } = require('bsw');
import { Log } from './../log';
import { Subscriber } from './subscriber';

export class BeanstalkSubscriber implements Subscriber {
    /**
     * Redis pub/sub client.
     *
     * @type {object}
     */
    private _beanstalk: any;

    /**
     * Create a new instance of subscriber.
     *
     * @param {any} options
     */
    constructor(private options) { }

    /**
     * Subscribe to events to broadcast.
     *
     * @return {Promise<any>}
     */
    subscribe(callback): Promise<any> {
        return new Promise((resolve, reject) => {
            this._beanstalk = new Consumer({
                ...this.options.databaseConfig.beanstalk,
                handler: async (data, job_info) => {
                    callback(data.channel, data.payload);
                    if (this.options.devMode) {
                        Log.info("Channel: " + data.channel);
                        Log.info("Event: " + JSON.stringify(data.payload));
                    }
                    return Promise.resolve('success');
                }
            });

            this._beanstalk.on('error', e => console.error('error:', e));


            Log.success('Listening for Beanstalk events...');
            this._beanstalk.start();
            resolve();
        });
    }
}
