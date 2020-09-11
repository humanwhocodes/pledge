/**
 * @fileoverview Tests for the Env class.
 */
/*global describe, it*/

//-----------------------------------------------------------------------------
// Requirements
//-----------------------------------------------------------------------------

import {
    createResolvingFunctions
} from "../src/pledge-operations.js";
import { Pledge } from "../src/pledge.js";
import { PledgeSymbol } from "../src/pledge-symbol.js";
import { expect } from "chai";

//-----------------------------------------------------------------------------
// Tests
//-----------------------------------------------------------------------------

describe("createResolvingFunctions()", () => {
    describe("resolve()", () => {
        it("should fulfill a given pledge when resolve is called", () => {
            const pledge = new Pledge(() => {});
            const { resolve } = createResolvingFunctions(pledge);
            resolve(42);
    
            expect(pledge[PledgeSymbol.state]).to.equal("fulfilled");
            expect(pledge[PledgeSymbol.result]).to.equal(42);
    
        });
    
        it("should resolve a given pledge when resolve is called with fulfilled pledge", done => {
            const pledge = new Pledge(() => {});
            const fulfilled = new Pledge(resolve => resolve(42));
            const { resolve } = createResolvingFunctions(pledge);
            resolve(fulfilled);
    
            expect(pledge[PledgeSymbol.state]).to.equal("pending");
            expect(pledge[PledgeSymbol.result]).to.be.undefined;
    
            queueMicrotask(() => {
                expect(pledge[PledgeSymbol.state]).to.equal("fulfilled");
                expect(pledge[PledgeSymbol.result]).to.equal(42);
                done();
            });
        });
    });

    describe("reject", () => {

        it("should reject a given pledge when reject is called", () => {
            const pledge = new Pledge(() => {});
            const { reject } = createResolvingFunctions(pledge);
            reject(42);
    
            expect(pledge[PledgeSymbol.state]).to.equal("rejected");
            expect(pledge[PledgeSymbol.result]).to.equal(42);
    
        });
    });


});
