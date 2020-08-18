/**
 * PledgeCapability class
 * @fileoverview A custom promise solution.
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { PledgeSymbol } from "./pledge-symbol.js";

//-----------------------------------------------------------------------------
// Main
//-----------------------------------------------------------------------------

export class PledgeCapability {

    constructor(promise) {
        this.promise = promise;
        this.resolve = value => {
            promise[PledgeSymbol.state] = "fulfilled";
            promise[PledgeSymbol.result] = value;
        };
        this.reject = reason => {
            promise[PledgeSymbol.state] = "rejected";
            promise[PledgeSymbol.result] = reason;
        };
    }
}
