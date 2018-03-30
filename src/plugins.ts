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
     * Server options.
     *
     * @type {Object}
     */
    private options: Object;

    /**
     * The plugins instances.
     *
     * @type {Array}
     */
    private all: Array<Object>;

    /**
     * Create a new instance.
     */
    public constructor(options) {
        Plugins.instance = this;

        this.events = new EventEmitter();
        this.options = options;
        this.all = [];

        let plugins = options.plugins;

        if(plugins.length === 0) {
            Log.success('No plugins to be loaded')
        } else {
            for (let i = 0; i < plugins.length; i++) {
                Log.success('Loading plugin : ' + plugins[i] + ' ...');
                try {
                    this.load(plugins[i])
                } catch (e) {
                    Log.error(e);
                }
            }
        }
    }

    private load(path): void {
        let plugin = null;

        // If it is an absolute path
        if(path.substring(0, 1) === '/') {
            plugin = require(path);
        } else {
            plugin = require('./../plugins/' + path);
        }

        plugin.install(this.events, this.options);
        this.all.push(plugin)
    }

    static emit(event, options?): void {
        this.instance.events.emit(event, options)
    }
}