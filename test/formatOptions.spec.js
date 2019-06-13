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

    it('should properly format tls configuration', function () {
        const out = formatOptions({
            defaultFields: {
                app: 'myapp'
            },
            includeFullMessage: false,
            protocol: 'tcp-tls',
            host: 'graylog.example.com',
            port: 22222,
            tlsKey: '42c8f5e5-bf3e-48d9-bf5d-f6d23d3220cf',
            tlsCert: 'adffc09a-13f8-4e26-a7f3-969424434efb',
            tlsCA: '50b42245-d1e5-410f-b385-d820fdfa6ef8'
        });

        expect(out).to.deep.equal({
            fields: {
                app: 'myapp'
            },
            includeFullMessage: false,
            middleware: [],
            adapterName: 'tcp-tls',
            adapterOptions: {
                host: 'graylog.example.com',
                port: 22222,
                family: 4,
                timeout: 1000,
                key: '42c8f5e5-bf3e-48d9-bf5d-f6d23d3220cf',
                cert: 'adffc09a-13f8-4e26-a7f3-969424434efb',
                ca: '50b42245-d1e5-410f-b385-d820fdfa6ef8'
            }
        });
    });
});
