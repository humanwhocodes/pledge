/**
 * @fileoverview Tests for the Env class.
 */
/*global describe, it*/

//-----------------------------------------------------------------------------
// Requirements
//-----------------------------------------------------------------------------

import {
    assertIsPledge,
    createResolvingFunctions,
    fulfillPledge,
    PledgeCapability
} from "../src/pledge-operations.js";
import { Pledge } from "../src/pledge.js";
import { PledgeSymbol } from "../src/pledge-symbol.js";
import { expect } from "chai";

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------
describe("pledge-operations", () => {

    describe("assertIsPledge", () => {

        it("should throw an error when a value is a non-Pledge object", () => {
            expect(() => {
                assertIsPledge({});
            }).to.throw(/Value must be a Pledge/);
        });

        it("should throw an error when a value is a primitive", () => {
            expect(() => {
                assertIsPledge(42);
            }).to.throw(/Value must be a Pledge/);

            expect(() => {
                assertIsPledge("");
            }).to.throw(/Value must be a Pledge/);
            
            expect(() => {
                assertIsPledge(true);
            }).to.throw(/Value must be a Pledge/);
            
            expect(() => {
                assertIsPledge(Symbol());
            }).to.throw(/Value must be a Pledge/);
        });
    });

    describe("new PledgeCapability()", () => {

        it("should throw an error when an arrow function is passed", () => {
            expect(() => {
                new PledgeCapability(() => {});
            }).to.throw(/C is not a constructor/);
        });

        it("should throw an error when a regular function is passed", () => {
            expect(() => {
                new PledgeCapability(function() {});
            }).to.throw(/resolve function is not callable/);
        });

        it("should throw an error when a regular function is passed without a reject parameter", () => {
            function FakePledge(executor) {
                executor(() => {});
            }

            expect(() => {
                new PledgeCapability(FakePledge);
            }).to.throw(/reject function is not callable/);
        });
    });

    describe("createResolvingFunctions()", () => {
        describe("resolve()", () => {
            it("should fulfill a given pledge when resolve is called", () => {
                const pledge = new Pledge(() => { });
                const { resolve } = createResolvingFunctions(pledge);
                resolve(42);

                expect(pledge[PledgeSymbol.state]).to.equal("fulfilled");
                expect(pledge[PledgeSymbol.result]).to.equal(42);

            });

            it("should resolve a given pledge when resolve is called with fulfilled pledge", done => {
                const pledge = new Pledge(() => { });
                const fulfilled = new Pledge(resolve => resolve(42));
                const { resolve } = createResolvingFunctions(pledge);
                resolve(fulfilled);

                expect(pledge[PledgeSymbol.state]).to.equal("pending");
                expect(pledge[PledgeSymbol.result]).to.be.undefined;

                setTimeout(() => {
                    expect(pledge[PledgeSymbol.state]).to.equal("fulfilled");
                    expect(pledge[PledgeSymbol.result]).to.equal(42);
                    done();
                }, 0);
            });
        });

        describe("reject", () => {

            it("should reject a given pledge when reject is called", () => {
                const pledge = new Pledge(() => { });
                const { reject } = createResolvingFunctions(pledge);
                reject(42);

                expect(pledge[PledgeSymbol.state]).to.equal("rejected");
                expect(pledge[PledgeSymbol.result]).to.equal(42);

            });
        });
    });

    describe("fulfillPledge()", () => {
        it("should set PledgeSymbol.state to fulfill if PledgeSymbol.state is pending", () => {
            const pledge = new Pledge(() => { });
            fulfillPledge(pledge);
            expect(pledge[PledgeSymbol.state]).to.equal("fulfilled");
            expect(pledge[PledgeSymbol.result]).to.be.undefined;
        });

        it("should set PledgeSymbol.result to argument if PledgeSymbol.state is pending", () => {
            const pledge = new Pledge(() => { });
            fulfillPledge(pledge, 42);
            expect(pledge[PledgeSymbol.state]).to.equal("fulfilled");
            expect(pledge[PledgeSymbol.result]).to.equal(42);
        });

        it("should throw an error if PledgeSymbol.state is not pending", () => {
            const pledge = new Pledge(resolve => { resolve(42); });
            expect(() => {
                fulfillPledge(pledge, 42);
            }).to.throw(/Pledge is already settled/);
        });

        it("should trigger fulfill reactions if PledgeSymbol.state is pending", done => {
            const pledge = new Pledge(() => { });
            pledge.then(value => {
                expect(value).to.equal(42);
                done();
            });
            fulfillPledge(pledge, 42);
        });
    });
});
