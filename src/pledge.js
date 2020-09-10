/**
 * Pledge class
 * @fileoverview A custom promise solution.
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { PledgeSymbol } from "./pledge-symbol.js";
import { PledgeReactionJob, queuePledgeJob } from "./pledge-jobs.js";
import {
    isPledge,
    createResolvingFunctions,
    PledgeFulfillReaction,
    PledgeRejectReaction,
    PledgeCapability
} from "./pledge-operations.js";

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

function assertIsPledge(pledge) {
    if (!isPledge(pledge)) {
        throw new TypeError("Value must be an instance of Pledge.");
    }
}

//-----------------------------------------------------------------------------
// 25.6.3 - 25.6.5
//-----------------------------------------------------------------------------

export class Pledge {
    constructor(executor) {

        if (typeof executor === "undefined") {
            throw new TypeError("Executor missing.");
        }

        if (typeof executor !== "function") {
            throw new TypeError("Executor must be a function.");
        }

        // initialize properties
        this[PledgeSymbol.state] = "pending";
        this[PledgeSymbol.result] = undefined;
        this[PledgeSymbol.isHandled] = false;
        this[PledgeSymbol.fulfillReactions] = [];
        this[PledgeSymbol.rejectReactions] = [];

        const { resolve, reject } = createResolvingFunctions(this);

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

    static get [Symbol.species]() {
        return this;
    }

    static resolve(value) {
        if (value instanceof Pledge && this === value.constructor) {
            return value;
        }

        const capability = new PledgeCapability(this);
        capability.resolve(value);
        return capability.pledge;
    }

    static reject(reason) {
        if (reason instanceof Pledge && this === reason.constructor) {
            return reason;
        }

        const capability = new PledgeCapability(this);
        capability.reject(reason);
        return capability.pledge;
    }

    then(onFulfilled, onRejected) {

        assertIsPledge(this);

        const speciesConstructor = this.constructor[Symbol.species];
        const capability = new PledgeCapability(speciesConstructor);
        return performPledgeThen(this, onFulfilled, onRejected, capability);
    }

    catch(rejectionHandler) {
        return this.then(null, rejectionHandler);
    }

    finally(onFinally) {
        assertIsPledge(this);

        const speciesConstructor = this.constructor[Symbol.species];
        let thenFinally, catchFinally;

        if (typeof onFinally !== "function") {
            thenFinally = onFinally;
            catchFinally = onFinally;
        } else {

            thenFinally = value => {
                const result = onFinally();
                const pledge = pledgeResolve(speciesConstructor, result);
                const valueThunk = () => value;
                return pledge.then(valueThunk);
            };

            catchFinally = reason => {
                const result = onFinally();
                const pledge = pledgeResolve(speciesConstructor, result);
                const thrower = () => {
                    throw reason;
                };
                return pledge.then(thrower);
            };
        }

        this.then(thenFinally, catchFinally);
    }
}


//-----------------------------------------------------------------------------
// 25.6.5.4.1 PerformPromiseThen(promise, onFulfilled, onRejected,
//              resultCapability)
//-----------------------------------------------------------------------------

function performPledgeThen(pledge, onFulfilled, onRejected, resultCapability) {
    assertIsPledge(pledge);

    if (typeof onFulfilled !== "function") {
        onFulfilled = undefined;
    }

    if (typeof onRejected !== "function") {
        onRejected = undefined;
    }

    const fulfillReaction = new PledgeFulfillReaction(resultCapability, onFulfilled);
    const rejectReaction = new PledgeRejectReaction(resultCapability, onRejected);

    switch (pledge[PledgeSymbol.state]) {

        case "pending":
            pledge[PledgeSymbol.fulfillReactions].push(fulfillReaction);
            pledge[PledgeSymbol.rejectReactions].push(rejectReaction);
            break;

        case "fulfilled": 
            {
                const value = pledge[PledgeSymbol.result];
                const fulfillJob = new PledgeReactionJob(fulfillReaction, value);
                queuePledgeJob(fulfillJob);
            }
            break;

        case "rejected":
            {
                const reason = pledge[PledgeSymbol.result];
                const rejectJob = new PledgeReactionJob(rejectReaction, reason);
                // TODO: if [[isHandled]] if false
                queuePledgeJob(rejectJob);
            }
            break;

        default:
            throw new TypeError(`Invalid pledge state: ${pledge[PledgeSymbol.state]}.`);
    }

    pledge[PledgeSymbol.isHandled] = true;

    return resultCapability ? resultCapability.pledge : undefined;
}
