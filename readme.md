## Gelfy

[![Build Status](https://travis-ci.org/dpjayasekara/node-gelfy.svg?branch=master)](https://travis-ci.org/dpjayasekara/node-gelfy) [![Coverage Status](https://coveralls.io/repos/github/dpjayasekara/node-gelfy/badge.svg?branch=master)](https://coveralls.io/github/dpjayasekara/node-gelfy?branch=master) [![Version](https://img.shields.io/npm/v/gelfy.svg)](https://www.npmjs.com/package/gelfy)

A customizable library for publishing application logs in GELF format(Graylog Extended Log Format) to Graylog. A modified version of [gelf-stream](https://github.com/mhart/gelf-stream/blob/master/gelf-stream.js) module for reliability and customizability for any logging library which supports writing to object streams. 

Why Gelfy?

- Logs can be directly pushed to a Graylog instance from the Node.js application
- Can be integrated directly into your logging library (Built-in integration with Bunyan, customizable for any logging library which supports JSON streams/transports)
- Supports GELF UDP, TCP, and TCP with TLS.
- Supports objects with circular references

### How does it work?

Gelfy is a just a writable stream in [object mode](https://nodejs.org/api/stream.html#stream_object_mode). Whichever objects written into the `gelfy` stream is sent to the configured Graylog instance in GELF format. 

## Installation

```
npm i gelfy
```

## Usage

### With Bunyan logger

```js
const gelfy = require('gelfy');
const bunyan = require('bunyan');

// See 'options' in API section for all available options
const options = {
 host: '127.0.0.1'
}

const bunyanStream = gelfy.createBunyanStream(options);
const logger = bunyan.createLogger({
    name: 'myapp',
    streams: [
        {
            type: 'raw',
            stream: bunyanStream
        }
    ]
});

logger.info('sample message'); // will be sent to graylog server at 127.0.0.1
```

### Configuration with 'Any other logging library'

Gelfy also has a generic object stream which you can plug into any logging library as a transporter/stream.

```js
const gelfy = require('gelfy');

// See 'options' in API section for all available options
const options = {
 host: '127.0.0.1'
}

const yourLogMessage = {
    msg: 'this is a log message',
    hostName: 'localhost',
    timestamp: '2019-05-25T17:45:28.222Z'
};

const gelfStream = gelfy.create(options);

/* Function to parse log message as a GELF Payload. 
 * See the following docs for GELF Payload specification:
 * http://docs.graylog.org/en/3.0/pages/gelf.html#gelf-payload-specification 
*/
const logParser = (log) => {
    return {
        short_message: log.msg,
        host: log.hostName,
        time: new Date(log.timestamp)/1000
    };
}

gelfStream.middleware(logParser);

// You can now use `gelfStream` as a transporter/output stream for your library.
```

## API

### gelfy.create([options])
Create a raw gelf object stream with provided options. returns a [GELF Stream](#class-gelfstream) instance

##### options.host
>type: string, default: 127.0.0.1

Graylog Hostname

##### options.port
>type: number, default: 12201

Graylog GELF input port. The default value for this is 12201 with GELF UDP. Depending on how many inputs are configured in your Graylog server, you might need to explicitly set this value if it is different.

##### options.defaultFields
>type: Object, default: 127.0.0.1

An object containing default fields which should be included in all messages.

e.g, 

```js
{
   "appName": "myapp",
   "environment": "development"
}
```

##### options.protocol
>type: string, default: udp

Transport layer protocol which should be used for GELF. Possible values are `udp`, `tcp` or `tcp-tls`.

##### options.family
>type: number, default: 4

Numeric value denoting ipv4 or ipv6. Possible values are `4`, `6`. Alternatively, `ipv4` or `ipv6` is also accepted.


##### options.tlsCert
>type: string

Client certificate for TLS. Required only if [protocol](#optionsprotocol) is set to `tcp-tls` and server requires client certificate authentication.

_See more: [https://nodejs.org/api/tls.html#tls_tls_connect_options_callback](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback)_

##### options.tlsKey
>type: string

Client key for TLS communication. Required only if [protocol](#optionsprotocol) is set to `tcp-tls` and server requires client certificate authentication.

_See more: [https://nodejs.org/api/tls.html#tls_tls_connect_options_callback](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback)_

##### options.tlsCA
>type: Array<string>

Server certificate for TLS communication. Required only if [protocol](#optionsprotocol) is set to `tcp-tls` and the server uses a self-signed certificate.

_See more: [https://nodejs.org/api/tls.html#tls_tls_connect_options_callback](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback)_

##### options.middleware
>type: Array<Function>

Add a list of middleware for parsing JSON log messages before writing to the GELF Stream (See [GELF Stream Middleware](#gelf-stream-middleware) section for more details) This is useful in order to convert arbitrary JSON to a GELF Payload. All adapters for log libraries use middleware in order to parse their logs to the GELF format. See the "**Configuration with 'Any other logging library'**" section for an example.

This function can be called multiple times with different middleware functions. If more than one middleware were provided, they will be called sequentially in the order they were defined in the array before writing the log to the GELF Stream.

It is also possible to add middleware later by calling `GELFStream.prototype.middleware` function on the created gelf stream.

##### options.includeFullMessage

>type: boolean, default: true

Setting this flag to false will NOT include the original JSON log message in `full_message` gelf field as a string. Set this to `false` to improve the performance if your log messages are too large.

### gelfy.createBunyanStream(options)

`gelfy.createBunyanStream` returns a special GELF stream which has built-in middleware for transforming Bunyan JSON log to GELF format. You can use the GELF stream returned by `gelfy.createBunyanStream` as a Bunyan stream directly. See the example [given above](#with-bunyan-logger).

All `options` are identical to the `gelfy.create` options above.

## class GELFStream

GELFStream is inherited from [Writable Stream](https://nodejs.org/api/stream.html#stream_writable_streams) class. Therefore, it inherits all the functionality of a Writable Stream. In addition to that, it has the following function.

##### GELFStream.prototype.middleware(middlewareFunction: Function)

Add middleware to for parsing JSON log messages before writing to the GELF Stream. (See [GELF Stream Middleware](#gelf-stream-middleware) section for more details)

`middleware` function can be called multiple times to add multiple middlewares, and they will be invoked sequentially in the order they were added.

## GELF Stream Middleware

GELF Stream Middleware is a function which can process log messages immediately before they were written into the GELF Stream. If you write your own integration with an arbitrary log library, you can define how the log messages are parsed to the GELF format using middleware. 

Built-in adapters such as Bunyan come with a pre-included middleware which converts a Bunyan JSON log message into a GELF Payload. See [gelfy.createBunyanStream](#gelfycreatebunyanstream) for more details.

```js
const gelfy = require('gelfy');
const stream = gelfy.create(); // create a GELF stream with default options

const middleware1 = (log) => ({
    short_message: log.msg,
    host: log.hostName,
    time: new Date(log.timestamp)/1000
});

const middleware2 = (log) => ({
    ...log,
    some_field: 'test'
});

stream.middleware(middlware1);
stream.middleware(middleware2);

stream.write({
    msg: 'test message',
    hostName: 'myserver',
    timestamp: '2019-05-25T17:45:28.222Z'
});

/* above code will write the following to the gelf stream:

{
    short_message: 'test message',
    host: 'myserver',
    time: 1558806328.222,
    some_field: 'test'
}

*/
```


## Contributing

You can contribute by creating new adapters for other log libraries. Currently, only Bunyan integration is built-in. Have a look at [how it is implemented](./src/adapters/bunyan.js).

You can also contribute by writing unit tests.

### Running Tests

You can run tests by simply running the command:

```
npm test
```

