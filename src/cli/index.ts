import { Cli } from './cli';

let cli = new Cli();

let yargs = require('yargs')
    .usage("Usage: laravel-echo-server <command> [options]")
    .command("start",               "Start up the server.",                          args => cli.start(args))
    .command("stop",                "Stops the server.",                             args => cli.stop(args))
    .command(["configure", "init"], "Initialize server with a config file.",         args => cli.configure(args)) // Has an alias of "init" for backwards compatibility, remove in next version
    .command("client:add",          "Register a client that can make api requests.", args => cli.clientAdd(args))
    .command("client:remove",       "Remove a registered client.",                   args => cli.clientRemove(args))
    .demand(1, "Please provide a valid command.")
    .help("help")
    .alias("help", "h");

yargs.$0 = '';

var argv = yargs.argv;
