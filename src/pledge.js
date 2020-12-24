/**
 * Pledge class
 * @fileoverview A custom promise solution.
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { PledgeSymbol } from "./pledge-symbol.js";
import { PledgeReactionJob, hostEnqueuePledgeJob } from "./pledge-jobs.js";
import {
    isObject,
    isCallable,
    isConstructor,
    PledgeAggregateError,
    iteratorStep,
    iteratorValue,
    getIterator,
    iteratorClose,
    ThrowCompletion
} from "./utilities.js";
import {
    isPledge,
    createResolvingFunctions,
    PledgeReaction,
    PledgeCapability,
    hostPledgeRejectionTracker
} from "./pledge-operations.js";
import { RejectionTracker } from "./rejection-tracker.js";

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

    static onUnhandledRejection(pledge, reason) {
        // noop
    }

    static rejectionHandled(pledge, reason) {
        // noop
    }

    static any(iterable) {

        const C = this;
        const pledgeCapability = new PledgeCapability(C);
        let iteratorRecord;

        try {
            const pledgeResolve = getPledgeResolve(C);
            iteratorRecord = getIterator(iterable);
            const result = performPledgeAny(iteratorRecord, C, pledgeCapability, pledgeResolve);
            return result;
        } catch (error) {

            let result = new ThrowCompletion(error);

            if (iteratorRecord && iteratorRecord.done === false) {
                result = iteratorClose(iteratorRecord, result);
            }

            pledgeCapability.reject(result.value);
            return pledgeCapability.pledge;
        }
    }

    static race(iterable) {

        const C = this;
        const pledgeCapability = new PledgeCapability(C);
        let iteratorRecord;

        try {
            const pledgeResolve = getPledgeResolve(C);
            iteratorRecord = getIterator(iterable);
            const result = performPledgeRace(iteratorRecord, C, pledgeCapability, pledgeResolve);
            return result;
        } catch (error) {

            let result = new ThrowCompletion(error);

            if (iteratorRecord && iteratorRecord.done === false) {
                result = iteratorClose(iteratorRecord, result);
            }

            pledgeCapability.reject(result.value);
            return pledgeCapability.pledge;
        }

    }

    static all(iterable) {

        const C = this;
        const pledgeCapability = new PledgeCapability(C);
        let iteratorRecord;

        try {
            const pledgeResolve = getPledgeResolve(C);
            iteratorRecord = getIterator(iterable);
            const result = performPledgeAll(iteratorRecord, C, pledgeCapability, pledgeResolve);
            return result;
        } catch (error) {

            let result = new ThrowCompletion(error);

            if (iteratorRecord && iteratorRecord.done === false) {
                result = iteratorClose(iteratorRecord, result);
            }

            pledgeCapability.reject(result.value);
            return pledgeCapability.pledge;
        }

    }

    static allSettled(iterable) {

        const C = this;
        const pledgeCapability = new PledgeCapability(C);
        let iteratorRecord;

        try {
            const pledgeResolve = getPledgeResolve(C);
            iteratorRecord = getIterator(iterable);
            const result = performPledgeAllSettled(iteratorRecord, C, pledgeCapability, pledgeResolve);
            return result;
        } catch (error) {

            let result = new ThrowCompletion(error);

            if (iteratorRecord && iteratorRecord.done === false) {
                result = iteratorClose(iteratorRecord, result);
            }

            pledgeCapability.reject(result.value);
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

Pledge[PledgeSymbol.rejectionTracker] = new RejectionTracker();

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
                if (pledge[PledgeSymbol.isHandled] === false) {
                    hostPledgeRejectionTracker(pledge, "handle");
                }

                const rejectJob = new PledgeReactionJob(rejectReaction, reason);
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
    const pledgeResolve = pledgeConstructor.resolve;

    if (!isCallable(pledgeResolve)) {
        throw new TypeError("resolve is not callable.");
    }

    return pledgeResolve;
}

//-----------------------------------------------------------------------------
// 26.6.4.1.2 PerformPromiseAll ( iteratorRecord, constructor, 
//      resultCapability, promiseResolve )
//-----------------------------------------------------------------------------

function performPledgeAll(iteratorRecord, constructor, resultCapability, pledgeResolve) {

    assertIsConstructor(constructor);
    assertIsCallable(pledgeResolve);

    const values = [];
    const remainingElementsCount = { value: 1 };
    let index = 0;

    while (true) {
        let next;

        try {
            next = iteratorStep(iteratorRecord);
        } catch (error) {
            iteratorRecord.done = true;
            resultCapability.reject(error);
            return resultCapability.pledge;
        }

        if (next === false) {
            remainingElementsCount.value = remainingElementsCount.value - 1;
            if (remainingElementsCount.value === 0) {
                resultCapability.resolve(values);
            }

            return resultCapability.pledge;
        }

        let nextValue;

        try {
            nextValue = iteratorValue(next);
        } catch (error) {
            iteratorRecord.done = true;
            resultCapability.reject(error);
            return resultCapability.pledge;
        }

        values.push(undefined);
        const nextPledge = pledgeResolve.call(constructor, nextValue);
        const resolveElement = createPledgeAllResolveElement(index, values, resultCapability, remainingElementsCount);

        remainingElementsCount.value = remainingElementsCount.value + 1;
        nextPledge.then(resolveElement, resultCapability.reject);
        index = index + 1;
    }

}

//-----------------------------------------------------------------------------
// 26.6.4.1.3 Promise.all Resolve Element Functions
//-----------------------------------------------------------------------------

// Note: this function doesn't exist in the spec, I've added it for clarity

function createPledgeAllResolveElement(index, values, pledgeCapability, remainingElementsCount) {

    const alreadyCalled = { value: false };

    return x => {

        if (alreadyCalled.value) {
            return;
        }

        alreadyCalled.value = true;

        values[index] = x;
        remainingElementsCount.value = remainingElementsCount.value - 1;

        if (remainingElementsCount.value === 0) {
            return pledgeCapability.resolve(values);
        }

    };
}



//-----------------------------------------------------------------------------
// 26.6.4.3.1 PerformPromiseAny ( iteratorRecord, constructor, 
//      resultCapability, promiseResolve )
//-----------------------------------------------------------------------------

function performPledgeAny(iteratorRecord, constructor, resultCapability, pledgeResolve) {

    assertIsConstructor(constructor);
    assertIsCallable(pledgeResolve);

    const errors = [];
    const remainingElementsCount = { value: 1 };
    let index = 0;

    while (true) {
        let next;
        
        try {
            next = iteratorStep(iteratorRecord);
        } catch (error) {
            iteratorRecord.done = true;
            resultCapability.reject(error);
            return resultCapability.pledge;
        }

        if (next === false) {
            remainingElementsCount.value = remainingElementsCount.value - 1;
            if (remainingElementsCount.value === 0) {
                const error = new PledgeAggregateError();
                Object.defineProperty(error, "errors", {
                    configurable: true,
                    enumerable: false,
                    writable: true,
                    value: errors
                });
        
                resultCapability.reject(error);
            }
        
            return resultCapability.pledge;
        }
        
        let nextValue;

        try {
            nextValue = iteratorValue(next);
        } catch(error) {
            iteratorRecord.done = true;
            resultCapability.reject(error);
            return resultCapability.pledge;
        }

        errors.push(undefined);
        const nextPledge = pledgeResolve.call(constructor, nextValue);
        const rejectElement = createPledgeAnyRejectElement(index, errors, resultCapability, remainingElementsCount);
        
        remainingElementsCount.value = remainingElementsCount.value + 1;
        nextPledge.then(resultCapability.resolve, rejectElement);
        index = index + 1;
    }

}

/*
 * This function is just FYI. The above function just looks complicated because of the way
 * iterators are used. The algorithm is actually fairly straightforward if you work with
 * the iterator in a normal fashion. Here's what it would look like if you were writing it
 * like a human being instead of copying the spec.
 */
function performPledgeAnySimple(iteratorRecord, constructor, resultCapability, pledgeResolve) {

    assertIsConstructor(constructor);
    assertIsCallable(pledgeResolve);

    // You could actually just pass the iterator instead of `iteratatorRecord`
    const iterator = iteratorRecord.iterator;

    const errors = [];
    const remainingElementsCount = { value: 1 };
    let index = 0;

    try {

        // loop over every value in the iterator
        for (const nextValue of iterator) {
            errors.push(undefined);

            const nextPledge = pledgeResolve.call(constructor, nextValue);
            const rejectElement = createPledgeAnyRejectElement(index, errors, resultCapability, remainingElementsCount);

            nextPledge.then(resultCapability.resolve, rejectElement);

            remainingElementsCount.value = remainingElementsCount.value + 1;
            index = index + 1;
        }

        remainingElementsCount.value = remainingElementsCount.value - 1;
        if (remainingElementsCount.value === 0) {
            const error = new PledgeAggregateError();
            Object.defineProperty(error, "errors", {
                configurable: true,
                enumerable: false,
                writable: true,
                value: errors
            });

            resultCapability.reject(error);
        }

    } catch (error) {
        resultCapability.reject(error);
    }

    iteratorRecord.done = true;
    return resultCapability.pledge;
}


//-----------------------------------------------------------------------------
// 26.6.4.3.2 Promise.any Reject Element Functions
//-----------------------------------------------------------------------------

// Note: this function doesn't exist in the spec, I've added it for clarity

function createPledgeAnyRejectElement(index, errors, pledgeCapability, remainingElementsCount) {

    const alreadyCalled = { value: false };

    return x => {

        if (alreadyCalled.value) {
            return;
        }

        alreadyCalled.value = true;

        errors[index] = x;
        remainingElementsCount.value = remainingElementsCount.value - 1;

        if (remainingElementsCount.value === 0) {
            const error = new PledgeAggregateError();
            Object.defineProperty(error, "errors", {
                configurable: true,
                enumerable: false,
                writable: true,
                value: errors
            });

            return pledgeCapability.reject(error);

        }

    };
}

//-----------------------------------------------------------------------------
// 26.6.4.5.1 PerformPromiseRace ( iteratorRecord, constructor,
//      resultCapability, promiseResolve )
//----------------------------------------------------------------------------- 

function performPledgeRace(iteratorRecord, constructor, resultCapability, pledgeResolve) {

    assertIsConstructor(constructor);
    assertIsCallable(pledgeResolve);

    while (true) {

        let next;
        
        try {
            next = iteratorStep(iteratorRecord);
        } catch (error) {
            iteratorRecord.done = true;
            resultCapability.reject(error);
            return resultCapability.pledge;
        }

        if (next === false) {
            iteratorRecord.done = true;
            return resultCapability.pledge;
        }

        let nextValue;

        try {
            nextValue = iteratorValue(next);
        } catch (error) {
            iteratorRecord.done = true;
            resultCapability.reject(error);
            return resultCapability.pledge;
        }

        const nextPledge = pledgeResolve.call(constructor, nextValue);
        nextPledge.then(resultCapability.resolve, resultCapability.reject);
    }

}

/*
 * This function is just FYI. The above function just looks complicated because of the way
 * iterators are used. The algorithm is actually fairly straightforward if you work with
 * the iterator in a normal fashion. Here's what it would look like if you were writing it
 * like a human being instead of copying the spec.
 */
function performPledgeRaceSimple(iteratorRecord, constructor, resultCapability, pledgeResolve) {

    assertIsConstructor(constructor);
    assertIsCallable(pledgeResolve);

    // You could actually just pass the iterator instead of `iteratatorRecord`
    const iterator = iteratorRecord.iterator;

    try {

        // loop over every value in the iterator
        for (const nextValue of iterator) {
            const nextPledge = pledgeResolve.call(constructor, nextValue);
            nextPledge.then(resultCapability.resolve, resultCapability.reject);
        }

    } catch (error) {
        resultCapability.reject(error);
    }

    iteratorRecord.done = true;
    return resultCapability.pledge;
}

//-----------------------------------------------------------------------------
// 26.6.4.2.1 PerformPromiseAllSettled ( iteratorRecord, constructor,
//      resultCapability, promiseResolve )
//-----------------------------------------------------------------------------

function performPledgeAllSettled(iteratorRecord, constructor, resultCapability, pledgeResolve) {

    assertIsConstructor(constructor);
    assertIsCallable(pledgeResolve);

    const values = [];
    const remainingElementsCount = { value: 1 };
    let index = 0;

    while (true) {
        let next;

        try {
            next = iteratorStep(iteratorRecord);
        } catch (error) {
            iteratorRecord.done = true;
            resultCapability.reject(error);
            return resultCapability.pledge;
        }

        if (next === false) {
            remainingElementsCount.value = remainingElementsCount.value - 1;
            if (remainingElementsCount.value === 0) {
                resultCapability.resolve(values);
            }

            return resultCapability.pledge;
        }

        let nextValue;

        try {
            nextValue = iteratorValue(next);
        } catch (error) {
            iteratorRecord.done = true;
            resultCapability.reject(error);
            return resultCapability.pledge;
        }

        values.push(undefined);
        const nextPledge = pledgeResolve.call(constructor, nextValue);
        const resolveElement = createPledgeAllSettledResolveElement(index, values, resultCapability, remainingElementsCount);
        const rejectElement = createPledgeAllSettledRejectElement(index, values, resultCapability, remainingElementsCount);

        remainingElementsCount.value = remainingElementsCount.value + 1;
        nextPledge.then(resolveElement, rejectElement);
        index = index + 1;
    }

}

//-----------------------------------------------------------------------------
// 26.6.4.2.2 Promise.allSettled Resolve Element Functions
//-----------------------------------------------------------------------------

// Note: this function doesn't exist in the spec, I've added it for clarity

function createPledgeAllSettledResolveElement(index, values, pledgeCapability, remainingElementsCount) {

    const alreadyCalled = { value: false };

    return x => {

        if (alreadyCalled.value) {
            return;
        }

        alreadyCalled.value = true;

        values[index] = {
            status: "fulfilled",
            value: x
        };

        remainingElementsCount.value = remainingElementsCount.value - 1;

        if (remainingElementsCount.value === 0) {
            return pledgeCapability.resolve(values);
        }

    };
}

//-----------------------------------------------------------------------------
// 26.6.4.2.3 Promise.allSettled Reject Element Functions
//-----------------------------------------------------------------------------

// Note: this function doesn't exist in the spec, I've added it for clarity

function createPledgeAllSettledRejectElement(index, values, pledgeCapability, remainingElementsCount) {

    const alreadyCalled = { value: false };

    return x => {

        if (alreadyCalled.value) {
            return;
        }

        alreadyCalled.value = true;

        values[index] = {
            status: "rejected",
            value: x
        };
        
        remainingElementsCount.value = remainingElementsCount.value - 1;

        if (remainingElementsCount.value === 0) {
            return pledgeCapability.resolve(values);
        }

    };
}
