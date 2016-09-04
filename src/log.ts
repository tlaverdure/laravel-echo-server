var colors = require('colors');

colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'green',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
});

export class Log {
    /**
     * Console log info.
     *
     * @param  {string|object} message
     * @param  {string} status
     * @return {void}
     */
    static info(message: any): void {
        console.log(colors.info(message));
    }

    /**
     * Console log success.
     *
     * @param  {string|object} message
     * @param  {string} status
     * @return {void}
     */
    static success(message: any): void {
        console.log(colors.green('\u2714'), message);
    }

    /**
     * Console log info.
     *
     * @param  {string|object} message
     * @param  {string} status
     * @return {void}
     */
    static error(message: any): void {
        console.log(colors.error(`Error: ${message}`));
    }
}
