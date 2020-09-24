/**
 * Pledge class
 * @fileoverview A custom promise solution.
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { PledgeSymbol } from "./pledge-symbol.js";
import { PledgeReactionJob, hostEnqueuePledgeJob } from "./pledge-jobs.js";
import { isObject, isCallable } from "./utilities.js";
import {
    isPledge,
    createResolvingFunctions,
    PledgeReaction,
    PledgeCapability
} from "./pledge-operations.js";

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

function assertIsObject(value) {
    if (!isObject(value)) {
        throw new TypeError("Value must be an object.");
    }
}

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

        if (!isCallable(executor)) {
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

    static resolve(x) {

        const C = this;

        if (!isObject(C)) {
            throw new TypeError("Cannot call resolve() without `this` value.");
        }

        return pledgeResolve(C, x);
    }

    static reject(reason) {
        
        const C = this;

        const capability = new PledgeCapability(C);
        capability.reject(reason);
        return capability.pledge;
    }

    then(onFulfilled, onRejected) {

        assertIsPledge(this);

        const C = this.constructor[Symbol.species];
        const resultCapability = new PledgeCapability(C);
        return performPledgeThen(this, onFulfilled, onRejected, resultCapability);
    }

    catch(rejectionHandler) {
        return this.then(null, rejectionHandler);
    }

    finally(onFinally) {
        assertIsPledge(this);

        const C = this.constructor[Symbol.species];
        let thenFinally, catchFinally;

        if (!isCallable(onFinally)) {
            thenFinally = onFinally;
            catchFinally = onFinally;
        } else {

            thenFinally = value => {
                const result = onFinally.apply(undefined);
                const pledge = pledgeResolve(C, result);
                const valueThunk = () => value;
                return pledge.then(valueThunk);
            };  
            
            catchFinally = reason => {
                const result = onFinally.apply(undefined);
                const pledge = pledgeResolve(C, result);
                const thrower = () => {
                    throw reason;
                };
                return pledge.then(thrower);
            };
        }

        return this.then(thenFinally, catchFinally);
    }
}


//-----------------------------------------------------------------------------
// 25.6.5.4.1 PerformPromiseThen(promise, onFulfilled, onRejected,
//              resultCapability)
//-----------------------------------------------------------------------------

function performPledgeThen(pledge, onFulfilled, onRejected, resultCapability) {
    assertIsPledge(pledge);

    if (!isCallable(onFulfilled)) {
        onFulfilled = undefined;
    }

    if (!isCallable(onRejected)) {
        onRejected = undefined;
    }

    const fulfillReaction = new PledgeReaction(resultCapability, "fulfill", onFulfilled);
    const rejectReaction = new PledgeReaction(resultCapability, "reject", onRejected);

    switch (pledge[PledgeSymbol.state]) {

        case "pending":
            pledge[PledgeSymbol.fulfillReactions].push(fulfillReaction);
            pledge[PledgeSymbol.rejectReactions].push(rejectReaction);
            break;

        case "fulfilled": 
            {
                const value = pledge[PledgeSymbol.result];
                const fulfillJob = new PledgeReactionJob(fulfillReaction, value);
                hostEnqueuePledgeJob(fulfillJob);
            }
            break;

        case "rejected":
            {
                const reason = pledge[PledgeSymbol.result];
                const rejectJob = new PledgeReactionJob(rejectReaction, reason);
                // TODO: if [[isHandled]] if false
                hostEnqueuePledgeJob(rejectJob);
            }
            break;

        default:
            throw new TypeError(`Invalid pledge state: ${pledge[PledgeSymbol.state]}.`);
    }

    pledge[PledgeSymbol.isHandled] = true;

    return resultCapability ? resultCapability.pledge : undefined;
}

//-----------------------------------------------------------------------------
// 25.6.4.6.1 PromiseResolve(C, x)
//-----------------------------------------------------------------------------

function pledgeResolve(C, x) {

    assertIsObject(C);

    if (isPledge(x)) {
        const xConstructor = x.constructor;

        if (Object.is(xConstructor, C)) {
            return x;
        }
    }

    const pledgeCapability = new PledgeCapability(C);
    pledgeCapability.resolve(x);
    return pledgeCapability.pledge;
}
