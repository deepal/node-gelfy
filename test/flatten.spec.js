/* eslint-disable prefer-arrow-callback, func-names */
import { expect } from 'chai';
import { flatten } from '../index';

describe('flatten function test suite', () => {
    it('should return a flatten object when a deep-nested object is provided', function () {
        const date = new Date();
        const regex = /.+/;
        const source = {
            a: 1,
            b: {
                c: 2,
                d: {
                    e: date,
                    f: {
                        g: 'test',
                        h: regex
                    }
                }
            }
        };

        const out = flatten(source);
        expect(out).to.deep.equal({
            a: 1,
            'b.c': 2,
            'b.d.e': date,
            'b.d.f.g': 'test',
            'b.d.f.h': regex
        });
    });
});
