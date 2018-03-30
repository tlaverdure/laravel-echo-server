import { EventEmitter } from 'events';
import { Log } from './log';

export class Plugins {
    /**
     * The singleton instance of this object.
     *
     * @type {Plugins}
     */
    private static instance: Plugins;

    /**
     * The event handler for hooking plugins events.
     *
     * @type {EventEmitter}
     */
    public events: EventEmitter;

    /**
     * The plugins instances.
     *
     * @type {Array}
     */
    private all: Array<Object>;

    /**
     * Create a new instance.
     */
    public constructor(plugins) {
        Plugins.instance = this;

        this.events = new EventEmitter();
        this.all = [];

        if(plugins.length === 0) {
            Log.success('No plugins to be loaded')
        } else {
            for (let i = 0; i < plugins.length; i++) {
                Log.success('Loading plugin : ' + plugins[i] + ' ...');
                try {
                    let plugin = require(plugins[i]);
                    plugin.install(this.events);
                    this.all.push(plugin)
                } catch (e) {
                    Log.error(e);
                }
            }
        }
    }

    static emit(event, options?): void {
        this.instance.events.emit(event, options)
    }
}