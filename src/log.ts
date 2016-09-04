var colors = require('colors');

colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'cyan',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red',
    h1: 'grey',
    h2: 'yellow'
});

export class Log {
    /**
     * Console log heading 1.
     *
     * @param  {string|object} message
     * @param  {string} status
     * @return {void}
     */
    static title(message: any): void {
        console.log(colors.bold(message));
    }

    /**
     * Console log heaing 2.
     *
     * @param  {string|object} message
     * @param  {string} status
     * @return {void}
     */
    static subtitle(message: any): void {
        console.log(colors.h2.bold(message));
    }

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
        console.log(colors.error(message));
    }
}
