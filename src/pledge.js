/**
 * Pledge class
 * @fileoverview A custom promise solution.
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { PledgeSymbol } from "./pledge-symbol.js";
import { PledgeReactionJob, hostEnqueuePledgeJob } from "./pledge-jobs.js";
import { isObject, isCallable, isConstructor } from "./utilities.js";
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

function assertIsCallable(value) {
    if (!isCallable(value)) {
        throw new TypeError("Value must be callable.");
    }
}

function assertIsConstructor(value) {
    if (!isConstructor(value)) {
        throw new TypeError("Value must be a constructor.");
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

    static race(iterable) {

        const C = this;
        const pledgeCapability = new PledgeCapability(C);

        try {
            const pledgeResolve = getPledgeResolve(C);
            const iteratorRecord = iterable[Symbol.iterator]();
            const result = performPledgeRace(iteratorRecord, C, pledgeCapability, pledgeResolve);
            return result;
        } catch (error) {
            pledgeCapability.reject(error);
            return pledgeCapability.pledge;
        }

    }

    static resolve(x) {

        const C = this;

        if (!isObject(C)) {
            throw new TypeError("Cannot call resolve() without `this` value.");
        }

        return pledgeResolve(C, x);
    }

    static reject(r) {
        
        const C = this;

        const capability = new PledgeCapability(C);
        capability.reject(r);
        return capability.pledge;
    }

    then(onFulfilled, onRejected) {

        assertIsPledge(this);

        const C = this.constructor[Symbol.species];
        const resultCapability = new PledgeCapability(C);
        return performPledgeThen(this, onFulfilled, onRejected, resultCapability);
    }

    catch(onRejected) {
        return this.then(null, onRejected);
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

            // not used by included for completeness with spec
            thenFinally.C = C;
            thenFinally.onFinally = onFinally;
            
            catchFinally = reason => {
                const result = onFinally.apply(undefined);
                const pledge = pledgeResolve(C, result);
                const thrower = () => {
                    throw reason;
                };
                return pledge.then(thrower);
            };

            // not used by included for completeness with spec
            catchFinally.C = C;
            catchFinally.onFinally = onFinally;

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

//-----------------------------------------------------------------------------
// 26.6.4.1.1 GetPromiseResolve ( promiseConstructor )
//-----------------------------------------------------------------------------

function getPledgeResolve(pledgeConstructor) {

    assertIsConstructor(pledgeConstructor);
    const promiseResolve = pledgeConstructor.resolve;

    if (!isCallable(promiseResolve)) {
        throw new TypeError("resolve is not callable.");
    }

    return pledgeResolve;
}

//-----------------------------------------------------------------------------
// 26.6.4.5.1 PerformPromiseRace ( iteratorRecord, constructor,
//      resultCapability, promiseResolve )
//----------------------------------------------------------------------------- 

function performPledgeRace(iteratorRecord, constructor, resultCapability, pledgeResolve) {

    assertIsConstructor(constructor);
    assertIsCallable(pledgeResolve);

    for (const nextValue of iteratorRecord) {
        const nextPledge = pledgeResolve(constructor, nextValue);
        nextPledge.then(resultCapability.resolve, resultCapability.reject);
    }

    return resultCapability.pledge;
}
