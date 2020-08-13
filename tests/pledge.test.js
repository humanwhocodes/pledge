/**
 * @fileoverview Tests for the Env class.
 */
/*global describe, it*/

//-----------------------------------------------------------------------------
// Requirements
//-----------------------------------------------------------------------------

import { Pledge, state, result } from "../src/pledge.js";
import { expect } from "chai";

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("Pledge", () => {

    describe("new Pledge()", () => {

        it("should throw an error when the executor is missing", () => {
            expect(() => {
                new Pledge();
            }).to.throw(/Executor missing/);
        });

        it("should throw an error when the executor is not a function", () => {
            expect(() => {
                new Pledge(42);
            }).to.throw(/Executor must be a function/);
        });

        
        it("should be in the fulfilled state when the executor calls resolve()", done => {
            const pledge = new Pledge(resolve => {
                resolve(42);
            });

            queueMicrotask(() => {
                expect(pledge[state]).to.equal("fulfilled");
                expect(pledge[result]).to.equal(42);
                done();
            });
        });

        it("should be in the rejected state when the executor calls reject()", done => {
            const error = new Error();
            const pledge = new Pledge((resolve, reject) => {
                reject(error);
            });

            queueMicrotask(() => {
                expect(pledge[state]).to.equal("rejected");
                expect(pledge[result]).to.equal(error);
                done();
            });
        });

        it("should be in the rejected state when the executor throws an error", done => {
            const error = new Error();
            const pledge = new Pledge(() => {
                throw error;
            });

            queueMicrotask(() => {
                expect(pledge[state]).to.equal("rejected");
                expect(pledge[result]).to.equal(error);
                done();
            });
        });



    });

});
