import { expect } from 'chai';
import BunyanAdapter from '../src/adapters/bunyan.js';

const adapter = new BunyanAdapter({
    client: {
        config: {
            levels: {
                debug: 0,
                info: 1,
                warning: 2,
                error: 3,
                emergency: 10
            }
        }
    }
});

describe('bunyan adapter tests', () => {
    it('should map bunyan log level to the corresponding gelf log level', () => {
        expect(adapter.mapGelfLevel(10)).to.equal(0);
        expect(adapter.mapGelfLevel(20)).to.equal(0);
        expect(adapter.mapGelfLevel(30)).to.equal(1);
        expect(adapter.mapGelfLevel(40)).to.equal(2);
        expect(adapter.mapGelfLevel(50)).to.equal(3);
        expect(adapter.mapGelfLevel(60)).to.equal(10);
        expect(adapter.mapGelfLevel(100)).to.equal(2);
    });

    it('should return a transformer function which converts bunyan log to the gelf-compliant message', () => {
        const transform = adapter.createTransformer();
        const logMsg = {
            name: 'my-app',
            environment: 'gelfy',
            hostname: 'local',
            pid: 58361,
            level: 20,
            msg: 'request processing is complete',
            time: '2019-02-22T16:01:06.179Z',
            v: 0,
            some_additional_field: 'test'
        };

        const gelfMsg = transform(logMsg);

        expect(gelfMsg.time).to.equal(1550851266.179);
        expect(gelfMsg.short_message).to.equal('request processing is complete');
        expect(gelfMsg.facility).to.equal('my-app');
        expect(gelfMsg.host).to.equal('local');
        expect(gelfMsg.bunyan_level).to.equal(20);
        expect(gelfMsg.level).to.equal(0);
        expect(gelfMsg.some_additional_field).to.equal('test');

        // the following fields should be not available in the gelf message
        expect(gelfMsg.msg).to.equal(undefined);
        expect(gelfMsg.hostname).to.equal(undefined);
        expect(gelfMsg.v).to.equal(undefined);
    });

    it('should include the errored file and line if the log message contains an err object', () => {
        const transform = adapter.createTransformer();
        const err = new Error();
        err.stack = `Error: 
        at Context.<anonymous> (/error/file/path:10:20)`;
        const logMsg = {
            name: 'my-app',
            environment: 'gelfy',
            hostname: 'local',
            pid: 58361,
            level: 50,
            msg: 'request processing failed',
            err,
            time: '2019-02-22T16:01:06.179Z',
            v: 0
        };
        const gelfMsg = transform(logMsg);

        expect(gelfMsg.file).to.equal('/error/file/path');
        expect(gelfMsg.line).to.equal('10');
    });

    it('should not include the error file and line if the error stack could not be parsed properly', () => {
        const transform = adapter.createTransformer();
        const err = new Error();
        err.stack = 'some unparsable stack';
        const logMsg = {
            name: 'my-app',
            environment: 'gelfy',
            hostname: 'local',
            pid: 58361,
            level: 50,
            msg: 'request processing failed',
            err,
            time: '2019-02-22T16:01:06.179Z',
            v: 0
        };
        const gelfMsg = transform(logMsg);

        expect(gelfMsg.file).to.equal(undefined);
        expect(gelfMsg.line).to.equal(undefined);
    });

    it('should not include the error file or line if the error file or line could not be extracted from the error stack', () => {
        const transform = adapter.createTransformer();
        const err = new Error();
        err.stack = `Error: 
        at Context.<anonymous> ( :0)`;
        const logMsg = {
            name: 'my-app',
            environment: 'gelfy',
            hostname: 'local',
            pid: 58361,
            level: 50,
            msg: 'request processing failed',
            err,
            time: '2019-02-22T16:01:06.179Z',
            v: 0
        };
        const gelfMsg = transform(logMsg);

        expect(gelfMsg.file).to.equal(undefined);
        expect(gelfMsg.line).to.equal(undefined);
    });

    it('should only include own properties of the original log message in the transformed gelf message', () => {
        const parentLog = {
            some_field_from_parent: 'test123'
        };
        const logMsg = Object.create(parentLog);
        logMsg.name = 'myapp';
        const transform = adapter.createTransformer();

        expect(logMsg.some_field_from_parent).to.equal('test123');
        const gelfMsg = transform(logMsg);
        expect(gelfMsg.facility).to.equal('myapp');
        expect(gelfMsg.some_field_from_parent).to.equal(undefined);
    });
});
