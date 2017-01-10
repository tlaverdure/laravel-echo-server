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

Run the init command in your project directory:

``` shell

$   laravel-echo-server init

```

The cli tool will help you setup a **laravel-echo-sever.json** file in the root directory of your project. This file will be loaded by the server during start up. You may edit this file later on to manage the configuration of your server.

#### App Key

After initial configuration, an app key will be stored in the **laravel-echo-server.json** file, app key is required to perform certain actions on the server.

To generate a new app key, use the cli command:

``` shell

$ laravel-echo-server key:generate

```

#### API Key

The Laravel Echo Server exposes a light http Api to perform broadcasting functionality. For security purposes, access to these endpoints from http referrers must be authenticated with an API key. This can be generated using the cli command:

``` shell

$ laravel-echo-server apikey:generate

```

After running this command, the Api key will be displayed and stored in the **laravel-echo-server.json** file.

In this example, requests will be allowed as long as the api_key is provided with http requests.

``` http
Request Headers

Auhtorization:  Bearer skti68i...

or

http://app.dev:6001/broadcast?auth_key=skti68i...

```

#### Run The Server

in your project root directory, run

``` shell

$ laravel-echo-server start

```

### Configurable Options

Edit the default configuration of the server by adding options to your **laravel-echo-server.json** file.


| Title            | Default              | Description |
| :--------------- | :------------------- | :-----------|
| `appKey`         | `''`                 | Unique app key used in security implementations |
| `apiKey`         | `''`                 | Private API key used to authorize HTTP requests |
| `authEndpoint`   | `/broadcasting/auth` | The route that authenticates private channels  |
| `authHost`       | `http://localhost`   | The host of the server that authenticates private and presence channels  |
| `database`       | `redis`              | Database used to store data that should persist, like presence channel members. Options are currently `redis` and `sqlite` |
| `databaseConfig` |  `{}`                |  Configurations for the different database drivers [Example](#database)|
| `host`           | `http://localhost`   | The host of the socket.io server ex.`app.dev` |
| `port`           | `6001`               | The port that the socket.io server should run on |
| `protocol`       | `http`               | either `http` or `https` |
| `sslCertPath`    | `''`                 | The path to your server's ssl certificate |
| `sslKeyPath`     | `''`                 | The path to your server's ssl key |
| `socketio`       | `{}`                 | Options to pass to the socket.io instance ([available options](https://github.com/socketio/engine.io#methods-1)) |

### Running with SSL

*   Your client side implementation must access the socket.io client from https.
*   The server configuration must set the server host to use https.
*   The server configuration should include paths to both your ssl certificate and key located on your server.

*Note: This library currently only supports serving from either http or https, not both.*

## Subscribers
The Laravel Echo Server subscribes to incoming events with two methods: Redis & Http.

### Redis

 Your core application can use Redis to publish events to channels. The Laravel Echo Server will subscribe to those channels and broadcast those messages via socket.io.

### Http

Using Http, you can also publish events to the Laravel Echo Server in the same fashion you would with Redis by submitting a `channel` and `message` to the broadcast endpoint. You need to generate an API key as described in the [API Key](#api-key) section and provide the correct API key.

**Request Endpoint**

``` http

POST http://app.dev:6001/apps/echo/events?auth_key=skti68i...

```

**Request Body**

``` json

{
  "channel": "channel-name",
  "name": "event-name",
  "data": {
      "key": "value"
  },
  "socket_id": "h3nAdb134tbvqwrg"
}

```

**channel** - The name of the channel to broadcast an event to. For private or presence channels prepend `private-` or `presence-`.
**channels** - Instead of a single channel, you can broadcast to an array of channels with 1 request.
**name** - A string that represents the event key within your app.
**data** - Data you would like to broadcast to channel.
**socket_id (optional)** - The socket id of the user that initiated the event. When present, the server will only "broadcast to others".

### Pusher

The HTTP subscriber is compatible with the Laravel Pusher subscriber. Just configure the host + port for your Socket.IO server and set the api key in config/broadcasting.php

```php
 'pusher' => [
    'driver' => 'pusher',
    'key' => skti68i...,
    'secret' => null,
    'app_id' => null,
    'options' => [
        'host' => 'localhost',
        'port' => 6001,
    ],
],
```

You can now send events using HTTP, without using Redis. This also allows you to use the Pusher API to list channels/users as described in the [Pusher PHP library](https://github.com/pusher/pusher-http-php)

```
use Illuminate\Support\Facades\Broadcast;

/** @var Pusher $pusher */
$pusher = Broadcast::getPusher();

dump($pusher->get('/status')); // Get total number of clients, uptime, memory usage
dump($pusher->get_channels());  // List of all channels
dump($pusher->get_channels(['filter_by_prefix' => 'private-'])); 
dump($pusher->get_channel_info('presence-chat'));       // Info about 1 channel
dump($pusher->get('/channels/presence-chat/users'));    // List of users
```

## Database

To persist presence channel data, there is support for use of Redis or SQLite as a key/value store. The key being the channel name, and the value being the list of presence channel members.

Each database driver may be configured in the **laravel-echo-server.json** file under the `databaseConfig` property. The options get passed through to the database provider, so developers are free to set these up as they wish.

### Redis
For example, if you wanted to pass a custom configuration to Redis:

``` json

{
  "databaseConfig" : {
    "redis" : {
      "port": "3001",
      "host": "redis.app.dev"
    }
  }
}

```
*Note: No scheme (http/https etc) should be used for the host address*

*A full list of Redis options can be found [here](https://github.com/luin/ioredis/blob/master/API.md#new-redisport-host-options).*

### SQLite
With SQLite you may be interested in changing the path where the database is stored:

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

You can include the socket.io client library from your running server. For example, if your server is running at `app.dev:6001` you should be able to
add a script tag to your html like so:

`<script src="//app.dev:6001/socket.io/socket.io.js"></script>`
