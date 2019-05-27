/* eslint-disable func-style */
import gelfClient from 'gelf-pro';
import stringify from 'fast-safe-stringify';
import { Writable } from 'stream';
import BunyanAdapter from './adapters/bunyan';

export function formatOptions(rawOpts = {}) {
    const normalizedIPFamily = +String.prototype.replace.call((rawOpts.family || ''), 'ipv', '') || 4;
    const includeFullMessage = Object.hasOwnProperty.call(rawOpts, 'includeFullMessage')
        ? rawOpts.includeFullMessage
        : true;

    const opts = {
        fields: rawOpts.defaultFields || {},
        middleware: rawOpts.middleware || [],
        includeFullMessage,
        adapterName: rawOpts.protocol || 'udp',
        adapterOptions: {
            host: rawOpts.host || '127.0.0.1',
            port: rawOpts.port || 12201,
            timeout: rawOpts.timeout || 1000
        }
    };

    if (opts.adapterName === 'udp') opts.adapterOptions.protocol = `udp${normalizedIPFamily}`;
    if (['tcp', 'tcp-tls'].includes(opts.adapterName)) opts.adapterOptions.family = normalizedIPFamily;

    if (opts.adapterName === 'tcp-tls') {
        opts.adapterOptions = {
            ...opts.adapterOptions,
            key: rawOpts.tlsKey,
            cert: rawOpts.tlsCert,
            ca: rawOpts.tlsCA
        };
    }

    return opts;
}

/**
 * Flatten an object
 * @param {Object} obj
 * @param {Object} into
 * @param {string} prefix
 * @param {string} sep
 * @returns {Object}
 */
export function flatten(obj, into = {}, prefix = '', sep = '.') {
    let key;
    let prop;
    for (key in obj) { // eslint-disable-line no-restricted-syntax
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            prop = obj[key];
            if (typeof prop === 'object' && !(prop instanceof Date) && !(prop instanceof RegExp)) {
                flatten(prop, into, prefix + key + sep, sep);
            } else {
                into[prefix + key] = prop; // eslint-disable-line no-param-reassign
            }
        }
    }
    return into;
}

/**
 * Remove any circular references in the object
 * @param {Object} obj
 * @returns {Object}
 */
export function removeCircularReferences(obj) {
    return JSON.parse(stringify(obj));
}

export default class GELFStream extends Writable {
    /**
     * Create an instance of GELFStream object
     * @param {Object} options
     * @param {string} options.host
     * @param {number} options.port
     * @param {Object} options.defaultFields
     * @param {string} options.protocol
     * @param {string|number} options.family
     * @param {string} options.tlsCert
     * @param {string} options.tlsKey
     * @param {Array.<string>} options.tlsCA
     * @param {Function} options.middleware
     * @param {bool} options.includeFullMessage
     */
    constructor(options = {}) {
        super({ objectMode: true });
        this.options = formatOptions(options);
        this.client = gelfClient;

        // Merge GELFStream config with default config
        this.client.setConfig(this.options);

        this.once('finish', this.destroy);
    }

    /**
     * Add middleware to transform log messages
     * @param {Function} fn
     */
    middleware(fn) {
        this.options.middleware.push(fn);
    }

    /**
     * Transform
     * @param {Object} chunk
     * @param {string} encoding
     * @param {Function} callback
     */
    _write(chunk, encoding, callback) {
        const flattenedLog = flatten(removeCircularReferences(chunk));
        // Apply middleware to transform log chunk
        const transformed = this.options.middleware.reduce(
            (obj, middlewareFn) => middlewareFn(obj),
            {
                ...this.options.fields,
                ...flattenedLog
            }
        );

        if (this.options.includeFullMessage) {
            transformed.full_message = stringify(chunk);
        }

        this.client.message(stringify(transformed), callback);
    }

    /**
     *
     * @param {Function} callback
     */
    destroy(callback) {
        if (callback) this.once('close', callback);
        process.nextTick(() => {
            this.emit('close');
        });
    }
}

/**
 *
 * @param {Object} options
 * @returns {GELFStream}
 */
export function create(options) {
    return new GELFStream(options);
}

/**
 * Create a GELF stream for bunyan logger
 * @param {string} host
 * @param {number} port
 * @param {Object} options
 * @returns {GELFStream}
 */
export function createBunyanStream(options = {}) {
    const gelfStream = new GELFStream(options);
    const bunyanAdapter = new BunyanAdapter(gelfStream);
    gelfStream.middleware(bunyanAdapter.createTransformer());

    return gelfStream;
}
