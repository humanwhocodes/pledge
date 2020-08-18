/**
 * Pledge class
 * @fileoverview A custom promise solution.
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { PledgeSymbol } from "./pledge-symbol.js";

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------


//-----------------------------------------------------------------------------
// Main
//-----------------------------------------------------------------------------

export class Pledge {
    constructor(executor) {

        if (typeof executor === "undefined") {
            throw new TypeError("Executor missing.");
        }

        if (typeof executor !== "function") {
            throw new TypeError("Executor must be a function.");
        }

        this[PledgeSymbol.state] = "pending";
        this[PledgeSymbol.result] = undefined;
        this[PledgeSymbol.isHandled] = false;
        this[PledgeSymbol.fulfillReactions] = [];
        this[PledgeSymbol.rejectReactions] = [];

        /**
         * Fulfills the pledge with the given value. Also initiates the
         * fulfillment handlers execution.
         * @param {*} value The value to fulfill the pledge with.
         * @returns {void} 
         */
        const resolve = value => {
            queueMicrotask(() => {
                this[PledgeSymbol.state] = "fulfilled";
                this[PledgeSymbol.result] = value;
                // TODO: run fulfillment handlers
            });
        };
        
        /**
         * Rejects the pledge with the given reason. Also initiates the
         * rejection handlers execution.
         * @param {*} reason The reason to reject the pledge with.
         * @returns {void}
         */
        const reject = reason => {
            queueMicrotask(() => {
                this[PledgeSymbol.state] = "rejected";
                this[PledgeSymbol.result] = reason;
                // TODO: run rejection handlers
            });
        };

        /*
         * The executor is executed immediately. If it throws an error, then
         * that is a rejection. The error should not be allowed to bubble
         * out of this function.
         */
        try {
            executor(resolve, reject);
        } catch(error) {
            reject(error);
        }

    }
}
