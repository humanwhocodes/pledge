/**
 * @fileoverview A custom promise solution.
 */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

export const state = Symbol.for("pledge:state");
export const result = Symbol.for("pledge:result");
export const isHandled = Symbol.for("pledge:isHandled");
export const fulfillReactions = Symbol.for("pledge:fulfillReactions");
export const rejectReactions = Symbol.for("pledge:rejectReactions");

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

        this[state] = "pending";
        this[result] = undefined;
        this[isHandled] = false;
        this[fulfillReactions] = [];
        this[rejectReactions] = [];

        /**
         * Fulfills the pledge with the given value. Also initiates the
         * fulfillment handlers execution.
         * @param {*} value The value to fulfill the pledge with.
         * @returns {void} 
         */
        const resolve = value => {
            queueMicrotask(() => {
                this[state] = "fulfilled";
                this[result] = value;
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
                this[state] = "rejected";
                this[result] = reason;
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
