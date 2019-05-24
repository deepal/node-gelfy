/* eslint-disable func-style */
import gelfClient from 'gelf-pro';
import stringify from 'fast-safe-stringify';
import { Writable } from 'stream';

export default class GELFStream extends Writable {
    /**
     * Create an instance of GELFStream object
     * @param {Object} options
     */
    constructor(options = {}) {
        const DEFAULT_GELF_HOST = '127.0.0.1';
        super({ objectMode: true });
        this.options = options;
        this.client = gelfClient;

        // Merge GELFStream config with default config
        this.client.setConfig({
            ...options,
            adapterOptions: {
                host: DEFAULT_GELF_HOST,
                ...options.adapterOptions
            }
        });

        this.once('finish', this.destroy);
    }

    /**
     * Transform
     * @param {Object} chunk
     * @param {string} encoding
     * @param {Function} callback
     */
    _write(chunk, encoding, callback) {
        if (!this.options.filter || this.options.filter(chunk)) {
            const obj = this.options.map ? this.options.map(chunk) : chunk;
            const { level } = obj;
            this.client.message(obj, level, callback);
            return;
        }

        callback();
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
 * Map bunyan log level to GELF log level
 * @param {number} bunyanLevel
 * @returns {number}
 */
export function mapGelfLevel(bunyanLevel) {
    const gelfLevel = gelfClient.config.levels;

    switch (bunyanLevel) {
        case 10: return gelfLevel.debug;
        case 20: return gelfLevel.debug;
        case 30: return gelfLevel.info;
        case 40: return gelfLevel.warning;
        case 50: return gelfLevel.error;
        case 60: return gelfLevel.emergency;
        default: return gelfLevel.warning;
    }
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

/**
 * Convert bunyan log message to GELF format
 * @param {Object} log
 * @returns {Object}
 */
export function bunyanToGelf(log) {
    const ignoreFields = ['msg', 'level', 'v'];
    const flattenedLog = flatten(removeCircularReferences(log));
    const gelfMsg = {
        time: +new Date(log.time) / 1000,
        short_message: log.msg,
        facility: log.name,
        level: mapGelfLevel(log.level),
        full_message: stringify(log)
    };

    if (log.err && log.err.stack) {
        const errFile = log.err.stack.match(/\n\s+at .+ \(([^:]+):([0-9]+)/);
        if (errFile) {
            if (errFile[1]) gelfMsg.file = errFile[1]; // eslint-disable-line prefer-destructuring
            if (errFile[2]) gelfMsg.line = errFile[2]; // eslint-disable-line prefer-destructuring
        }
    }

    // TODO: Improve this using `reduce`
    for (const key in flattenedLog) { // eslint-disable-line no-restricted-syntax
        if (Object.hasOwnProperty.call(flattenedLog, key)) {
            if (ignoreFields.indexOf(key) < 0 && !Object.hasOwnProperty.call(gelfMsg, key)) {
                gelfMsg[key] = flattenedLog[key];
            }
        }
    }

    return gelfMsg;
}

/**
 * Create a GELF stream for bunyan logger
 * @param {string} host
 * @param {number} port
 * @param {Object} options
 * @returns {GELFStream}
 */
export function createBunyanStream(options = {}) {
    return new GELFStream({ ...options, map: bunyanToGelf });
}
