/**
 * @fileoverview Tests for the Env class.
 */
/*global describe, it*/

//-----------------------------------------------------------------------------
// Requirements
//-----------------------------------------------------------------------------

import { Pledge } from "../src/pledge.js";
import { PledgeSymbol } from "../src/pledge-symbol.js";
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

        it("should be in the fulfilled PledgeSymbol.state when the executor calls resolve()", () => {
            const pledge = new Pledge(resolve => {
                resolve(42);
            });

            expect(pledge[PledgeSymbol.state]).to.equal("fulfilled");
            expect(pledge[PledgeSymbol.result]).to.equal(42);
        });

        it("should be in the rejected PledgeSymbol.state when the executor calls reject()", () => {
            const error = new Error();
            const pledge = new Pledge((resolve, reject) => {
                reject(error);
            });

            expect(pledge[PledgeSymbol.state]).to.equal("rejected");
            expect(pledge[PledgeSymbol.result]).to.equal(error);
        });

        it("should be in the rejected PledgeSymbol.state when the executor throws an error", () => {
            const error = new Error();
            const pledge = new Pledge(() => {
                throw error;
            });

            expect(pledge[PledgeSymbol.state]).to.equal("rejected");
            expect(pledge[PledgeSymbol.result]).to.equal(error);
        });

        it("should be in the fulfilled PledgeSymbol.state when the executor calls resolve() with another pledege that is fulfilled", done => {

            const pledge1 = new Pledge(resolve => {
                resolve(42);
            });

            const pledge2 = new Pledge(resolve => {
                resolve(pledge1);
            });

            // first we should be in the pending state
            expect(pledge2[PledgeSymbol.state]).to.equal("pending");
            expect(pledge2[PledgeSymbol.result]).to.be.undefined;

            // then we should be in the fulfilled state
            setTimeout(() => {
                expect(pledge2[PledgeSymbol.state]).to.equal("fulfilled");
                expect(pledge2[PledgeSymbol.result]).to.equal(42);
                done();
            }, 0);
        });


    });

    describe("then()", () => {

        it("register a fulfillment handler when called with one argument in fulfilled state", done => {
            const pledge = new Pledge(resolve => {
                resolve(42);
            });

            pledge.then(value => {
                expect(value).to.equal(42);
                done();
            });

        });

        it("register a fulfillment handler when called with one argument in pending state", done => {
            const pledge = new Pledge(resolve => {
                setTimeout(() => {
                    resolve(42);
                }, 100);
            });

            pledge.then(value => {
                expect(value).to.equal(42);
                done();
            });

        });

        it("register a rejection handler when called with one argument in rejected state", done => {
            const pledge = new Pledge((resolve, reject) => {
                reject(42);
            });

            pledge.then(undefined, value => {
                expect(value).to.equal(42);
                done();
            });

        });

        it("register a rejection handler when called with one argument in pending state", done => {
            const pledge = new Pledge((resolve, reject) => {
                setTimeout(() => {
                    reject(42);
                }, 100);
            });

            pledge.then(undefined, value => {
                expect(value).to.equal(42);
                done();
            });

        });
    });

    describe("catch()", () => {

        it("register a rejection handler when called in rejected state", done => {
            const pledge = new Pledge((resolve, reject) => {
                reject(42);
            });

            pledge.catch(value => {
                expect(value).to.equal(42);
                done();
            });

        });

        it("register a rejection handler when called with one argument in pending state", done => {
            const pledge = new Pledge((resolve, reject) => {
                setTimeout(() => {
                    reject(42);
                }, 100);
            });

            pledge.catch(value => {
                expect(value).to.equal(42);
                done();
            });

        });
    });

});
