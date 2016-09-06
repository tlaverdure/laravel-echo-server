# Laravel Echo Server

NodeJs server for Laravel Echo broadcasting with Socket.io.

## System Requirements

The following are required to function properly.

*   Laravel 5.3
*   Node 5.0+
*   Redis 3+

Additional information on broadcasting with Laravel can be found on the
official docs: <https://laravel.com/docs/master/broadcasting>

## Getting Started

Install npm package globally with the following command:

``` shell

$   npm install -g laravel-echo-server

```

### Initialize with CLI Tool

Run the init command in your project diretory:

``` shell

$   laravel-echo-server init

```

The cli tool will help you setup a **laravel-echo-sever.json** file in the root directory of your project. This file will be loaded by the server during start up. You may edit this file later on to manage the configuration of your server.

#### App Key

After initial configuration, an app key will be stored in the laravel-echo-server.json file. An app key is required to perform certain actions on the server. To generate a new app key, use the cli command:

``` shell

$ laravel-echo-server key:generate

```

#### Referrers

The server exposes a light http api to perform broadcasting functionality. For security purposes, access to these endpoints from http referrers other than the server's host must be registered. This can be done using the cli command:

``` shell

$ laravel-echo-server referrer:add example.com

```

After running this command, an api key for the referrer will be displayed and stored in the laravel-echo-server.json file.

In this example, requests from example.com will be allowed as long as the referrer's api_key is provided with http requests.

``` http
Request Headers

Auhtorization:  Bearer skti68i...

```

### Configurable Options

Edit the default configuration of the server by adding options to your laravel-echo-server.json file.


| Title          | Default        | Description |
| :------------- | :------------- | :-----------|
| `appKey`       | `string`       | Unique app key used in security implementations |
| `authHost`     | `http://localhost` | The host of the server that authenticates private and presence channels  |
| `authPath`     | `/broadcasting/auth` | The route that authenticates private channels  |
| `database`     | `redis`        | Database used to store data that should persist, like presence channel members. Options are currently `redis` and `sqlite` |
| `databaseConfig` |  `object`    |  Configurations for the different database drivers |
| `hostname`     | `http://localhost` | The host of the socket.io server |
| `port`         | `6001`         | The port that the socket.io server should run on |
| `sslCertPath`  | `string`       | The path to your server's ssl certificate |
| `sslKeyPath`   | `string`       | The path to your server's ssl key |

### Running with SSL

*   Your client side implementation must access the socket.io client from https.
*   The server configuration must set the server host to use https.
*   The server configuration should include paths to both your ssl certificate and key located on your server.

*Note: This library currently only supports serving from either http or https, not both.*

## Subscribers
The Laravel Echo Server subscribes to incoming events with two methods: Redis & Http.

### Redis

 Your core application can use Redis to publish events to channels. The server will subscribe to those channels and broadcast those messages via socket.io.

 ### Http

Using Http, you can publish events to the Laravel Echo Server in the same fashion you would with Redis by passing a channel and message to broadcast.

**Request Endpoint**

``` http

POST http://app.dev:6001/broadcast

```

**Request Body**

``` json

{
  "channel": "channel-name",
  "message": {
    "event":"event-name",
    "data": {
       "key": "value"
     },
     "socket": "h3nAdb134tbvqwrg"
   }
}

```

**Channel Name** - The name of the channel to broadcast an event to. For private or presence channels prepend `private-` or `presence-`.

 **Message** - Object containing information about the event.
 *   **event** - A string that represents the event key within your app.
 *   **data** - Data you would like to broadcast to channel.
 *   **socket (optional)** - The socket id of the user that initiated the event. When present, the server will only "broadcast to others".

## Database

To persist presence channel data, there is support for use of Redis or SQLite as a key/value store. The key being the channel name, and the value being the list of presence channel members.

Each database driver may be configured in the laravel-echo-server.json file under the `databaseConfig` property. The options get passed through to the database provider, so developers are free to set these up as they wish.

### Redis
For example, if you wanted to pass a custom configuration to Redis:

``` json
{
  "databaseConfig" : {
    "redis" : {
      "port": "3001",
      "host": "http://redis.app.dev"
    }
  }
}

```
*A full list of Redis options can be found [here](https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options).*

### SQLite
With SQLite you may want to change the path where the database is stored:

``` json
{
  "databaseConfig" : {
    "sqlite" : {
      "databasePath": "/path/to/laravel-echo-server.sqlite"
    }
  }
}

```

## Presence Channels

When users join a presence channel, their presence channel authentication data is stored using Redis.

While presence channels contain a list of users, there will be instances where a user joins a presence channel multiple times. For example, this would occur when opening multiple browser tabs. In this situation "joining" and "leaving" events are only emitted to the first and last instance of the user.

## Client Side Configuration

See the official Laravel documentation for more information. <https://laravel.com/docs/5.3/broadcasting#introduction>

### Tips

You can include the socket.io client libray from your running server. For example, if your server is running at `app.dev:6001` you should be able to
add a script tag to your html like so:

`<script src="//app.dev:6001/socket.io/socket.io.js"></script>`
