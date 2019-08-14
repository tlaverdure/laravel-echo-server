import {Log_interface} from "./log_interface";
const bunyan = require('bunyan');
const bsyslog = require('bunyan-syslog');
const path = require('path');

// Syslog facilities
// https://github.com/joyent/node-bunyan-syslog/blob/c3daebfdf49f737110616a87f52c1a0feb6fdbd9/lib/index.js#L13

export class Bunyan implements Log_interface {

    /**
     * instance of syslog|file logger
     */
    private _log: any;

    /**
     * Logs Folder
     */
    private readonly _path: any;

    /**
     * Create a new instance Bunyan based on options.log
     *
     * @return bunyan file|syslog logger
     */
    constructor(private options: any) {

        switch (this.options.log) {
            case 'file': {
                this._path = path.resolve(__dirname, this.options.log_folder);
                this._log = this.fileLogger();
                break;
            }
            case 'syslog': {
                this._log = this.sysLogger();
                break;
            }
            default: {
                console.error('No logger defined')
            }
        }
    }

    /**
     * Log to SysLog
     *
     * @return bunyan Syslog logger
     */
    protected sysLogger() {
        return bunyan.createLogger({
            name: this.options.app_name,
            streams: [{
                level: 'info',
                type: 'raw',
                stream: bsyslog.createBunyanStream({
                    type: this.options.syslog.type || 'sys',
                    facility: this.options.syslog.facility ? bsyslog[this.options.syslog.facility] : bsyslog.local0,
                    host: this.options.syslog.host || '127.0.0.1',
                    port: this.options.syslog.port ||  514
                })
            }, {
                level: 'error',
                type: 'raw',
                stream: bsyslog.createBunyanStream({
                    type: this.options.syslog.type || 'sys',
                    facility: this.options.syslog.facility ? bsyslog[this.options.syslog.facility] : bsyslog.local0,
                    host: this.options.syslog.host || '127.0.0.1',
                    port: this.options.syslog.port ||  514
                })
            }]
        });
    }

    /**
     * Log to File
     *
     * @return bunyan file logger
     */
    protected fileLogger() {
        return bunyan.createLogger({
            name: this.options.app_name,
            streams: [{
                level: 'info',
                path: `${this._path}/info.log`
            }, {
                    level: 'error',
                    path: `${this._path}/error.log`
                }]
        });

    }

    /**
     * Error
     *
     * @param data
     */
    public error(data: any): void {
        this._log.error(data)
    }

    /**
     * Info
     *
     * @param data
     */
    public info(data: any): void {
        this._log.info(data)
    }
}


