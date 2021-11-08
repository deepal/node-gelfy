import { expect } from 'chai';
import { createSandbox } from 'sinon';
import gelfClient from 'gelf-pro';
import GELFStream, { create, createBunyanStream } from '../src/index.js';

let sandbox;

function createGELFStream(gelfClient) {
    class MockedGelfStream extends GELFStream {
        constructor(options = {}) {
            super(options);
            this.client = gelfClient;
            this.client.setConfig(this.options);
            this.once('finish', this.destroy);
        }
    }
    return MockedGelfStream;
}

describe('Gelf stream tests', () => {
    beforeEach(() => {
        sandbox = createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should use default options object if no options provided for constructor', () => {
        const stream = new GELFStream();
        expect(stream.options).to.eql({
            adapterName: 'udp',
            adapterOptions: {
                host: '127.0.0.1',
                port: 12201,
                protocol: 'udp4',
                timeout: 1000
            },
            fields: {},
            includeFullMessage: true,
            middleware: []
        });
    });

    it('should add a provided middleware to the middleware list when .middleware() is called with a function', () => {
        const stream = new GELFStream();
        const myFunc1 = () => {};
        const myFunc2 = () => {};

        stream.middleware(myFunc1);
        stream.middleware(myFunc2);

        expect(stream.options.middleware).to.be.instanceOf(Array).lengthOf(2);
        expect(stream.options.middleware[0]).to.eql(myFunc1);
        expect(stream.options.middleware[1]).to.eql(myFunc2);
    });

    it('should send all the written log messages the stream to the graylog server via the gelf client', () => {
        const gelfClient = {
            send: sandbox.stub(),
            setConfig: sandbox.stub()
        };

        const MockedGelfStream = createGELFStream(gelfClient);

        const stream = new MockedGelfStream();
        expect(gelfClient.setConfig.calledOnce).to.equal(true);
        expect(gelfClient.setConfig.getCall(0).args[0]).to.eql({
            adapterName: 'udp',
            adapterOptions: {
                host: '127.0.0.1',
                port: 12201,
                protocol: 'udp4',
                timeout: 1000
            },
            fields: {},
            includeFullMessage: true,
            middleware: []
        });

        const message1 = {
            message: 'this is test 1'
        };

        const message2 = {
            message: 'this is test 1'
        };

        stream.write(message1);
        expect(gelfClient.send.withArgs({
            message: 'this is test 1',
            full_message: JSON.stringify(message1)
        }));
        stream.write(message2);
        expect(gelfClient.send.withArgs({
            message: 'this is test 2',
            full_message: JSON.stringify(message2)
        }));
    });

    it('should not include the stringified json messages in the sent gelf log if includeFullMessage is set to false', () => {
        const gelfClient = {
            send: sandbox.stub(),
            setConfig: sandbox.stub()
        };

        const MockedGelfStream = createGELFStream(gelfClient);

        const stream = new MockedGelfStream({
            includeFullMessage: false
        });
        const message = {
            message: 'this is a test'
        };

        stream.write(message);
        expect(gelfClient.send.withArgs({
            message: 'this is test 1'
        }));
    });

    it('log message should be transformed after processing with each middleware configured', () => {
        const gelfClient = {
            send: sandbox.stub(),
            setConfig: sandbox.stub()
        };

        const message = { message: 'this is a test' };
        const transformedMessage1 = { msg: 'THIS IS A TEST', v: 1 };
        const transformedMessage2 = { ...transformedMessage1, v: 2 };

        const middleware1 = sandbox.stub().returns(transformedMessage1);
        const middleware2 = sandbox.stub().returns(transformedMessage2);

        const MockedGelfStream = createGELFStream(gelfClient);

        const stream = new MockedGelfStream({
            includeFullMessage: false,
            middleware: [middleware1, middleware2]
        });

        stream.write(message);
        expect(middleware1.withArgs(message).calledOnce).to.equal(true);
        expect(middleware2.withArgs(transformedMessage1).calledOnce).to.equal(true);
        expect(gelfClient.send.withArgs('{"msg":"THIS IS A TEST","v":2}').calledOnce).to.equal(true);
    });

    it('should asynchronously close the stream if destroy is called with a callback', done => {
        const stream = new GELFStream();
        const cb = sandbox.stub();

        stream.destroy(cb);
        process.nextTick(() => {
            expect(cb.calledOnce).to.equal(true);
            done();
        });
    });

    it('should not add a \'close\' event callback if a callback not provided for .destroy() function', () => {
        const stream = new GELFStream();
        stream.destroy();
        expect(stream._events.close).to.equal(undefined);
    });

    it('should return a new instance of GELFStream if create() exported function is called', () => {
        const out = create();
        expect(out).to.be.instanceOf(GELFStream);
    });

    it('should create a gelf stream with bunyan transform middleware configured when createBunyanStream() is called', () => {
        const gelfMsgStub = sandbox.stub(gelfClient, 'send');

        const logMsg = {
            name: 'my-app',
            environment: 'gelfy',
            hostname: 'mb01132.local',
            pid: 58361,
            level: 20,
            msg: 'request processing is complete',
            time: '2019-02-22T16:01:06.179Z',
            v: 0
        };

        const stream = createBunyanStream();
        expect(stream.options.middleware).to.be.instanceOf(Array).lengthOf(1);

        stream.write(logMsg);
        expect(gelfMsgStub.getCall(0).args[0]).equal('{"time":1550851266.179,"short_message":"request processing is complete","facility":"my-app","host":"mb01132.local","bunyan_level":20,"level":7,"name":"my-app","environment":"gelfy","pid":58361,"full_message":"{\\"name\\":\\"my-app\\",\\"environment\\":\\"gelfy\\",\\"hostname\\":\\"mb01132.local\\",\\"pid\\":58361,\\"level\\":20,\\"msg\\":\\"request processing is complete\\",\\"time\\":\\"2019-02-22T16:01:06.179Z\\",\\"v\\":0}"}'); // eslint-disable-line max-len
    });
});
