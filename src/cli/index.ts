import { Cli } from './cli';

let cli = new Cli();
let yargs = require('yargs')();

yargs.$0 = '';

/**
 * CLI Commands.
 */
var argv = yargs.usage("Usage: laravel-echo-server <command> [options]")
    .command("start",               "Start up the server.",                          yargs => cli.start(yargs))
    .command("stop",                "Stops the server.",                             yargs => cli.stop(yargs))
    .command(["configure", "init"], "Initialize server with a config file.",         yargs => cli.configure(yargs)) // Has an alias of "init" for backwards compatibility, remove in next version
    .command("client:add",          "Register a client that can make api requests.", yargs => cli.clientAdd(yargs))
    .command("client:remove",       "Remove a registered client.",                   yargs => cli.clientRemove(yargs))
    .demand(1, "Please provide a valid command.")
    .help("help")
    .alias("help", "h")
    .argv;
