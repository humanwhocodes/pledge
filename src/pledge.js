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

        const resolve = value => {
            this[state] = "fulfilled";
            this[result] = value;
        };
        
        const reject = reason => {
            this[state] = "rejected";
            this[result] = reason;
        };

        try {
            executor(resolve, reject);
        } catch(error) {
            reject(error);
        }

    }
}
