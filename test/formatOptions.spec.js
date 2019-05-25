/* eslint-disable prefer-arrow-callback, func-names */
import { expect } from 'chai';
import { formatOptions } from '../src';

describe('formatOptions function tests', function () {
    it('should return a formatted options object with default values if no options were provided', function () {
        const out = formatOptions();
        expect(out).to.deep.equal({
            fields: {},
            adapterName: 'udp',
            middleware: [],
            includeFullMessage: true,
            adapterOptions: {
                host: '127.0.0.1',
                port: 12201,
                timeout: 1000,
                protocol: 'udp4'
            }
        });
    });

    it('should return a formatted options object merged with provided options with default values', function () {
        const middleware = [() => {}, () => {}];
        const out = formatOptions({
            defaultFields: {
                app: 'myapp'
            },
            includeFullMessage: false,
            protocol: 'tcp',
            middleware,
            host: 'graylog.example.com',
            port: 22222,
            family: 'ipv6',
            timeout: 9999
        });

        expect(out).to.deep.equal({
            fields: {
                app: 'myapp'
            },
            includeFullMessage: false,
            adapterName: 'tcp',
            middleware,
            adapterOptions: {
                host: 'graylog.example.com',
                port: 22222,
                family: 6,
                timeout: 9999
            }
        });
    });
});
