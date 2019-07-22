/* eslint-disable prefer-arrow-callback,func-names,no-underscore-dangle */
import sinon from 'sinon';
import { expect } from 'chai';
import { createBunyanStream } from '../src';

const logMessage = {
    name: 'web-app-1',
    environment: 'production',
    hostname: 'mywebserver',
    pid: 212,
    level: 30,
    msg: 'Incoming HTTP Request: GET /ping',
    time: '2019-05-24T09:46:12.126Z',
    v: 0
};

let sandbox;

describe('gelf exporter tests for bunyan', () => {
    beforeEach(function () {
        sandbox = sinon.createSandbox();
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('bunyan stream should transform the bunyan logs and send in GELF format with default configs', () => {
        const stream = createBunyanStream();
        const sendGelfMessage = sandbox.stub(stream.client, 'send');
        const streamWriteCallback = sandbox.stub();
        stream._write(logMessage, null, streamWriteCallback);
        expect(sendGelfMessage.calledOnce).to.equal(true);
        expect(sendGelfMessage.getCall(0).args[0]).to.equal(JSON.stringify({
            time: 1558691172.126,
            short_message: 'Incoming HTTP Request: GET /ping',
            facility: 'web-app-1',
            host: 'mywebserver',
            bunyan_level: 30,
            level: 6,
            name: 'web-app-1',
            environment: 'production',
            pid: 212,
            full_message: JSON.stringify(logMessage)
        }));
    });
});
