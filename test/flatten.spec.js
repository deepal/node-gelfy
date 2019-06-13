/* eslint-disable prefer-arrow-callback, func-names */
import { expect } from 'chai';
import { flatten } from '../src';

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

    it('should not attempt to flatten any properties which are not own properties of the source object', function () {
        const parent = {
            a: 1
        };

        const child = Object.create(parent);
        child.b = 2;

        const out = flatten(child);
        expect(out).to.deep.equal({
            b: 2
        });
    });
});
