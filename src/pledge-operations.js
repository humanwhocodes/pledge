/**
 * @fileoverview ECMA-262 25.6.1 Promise Abstract Operations.
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { PledgeSymbol } from "./pledge-symbol.js";
import {
    PledgeResolveThenableJob,
    PledgeReactionJob,
    hostEnqueuePledgeJob
} from "./pledge-jobs.js";
import { isObject, isCallable } from "./utilities.js";

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

export function assertIsPledge(value) {
    if (!isPledge(value)) {
        throw new TypeError("Value must be a Pledge.");
    }
}

//-----------------------------------------------------------------------------
// 25.6.1.1 PromiseCapability Records
// 25.6.1.5 NewPromiseCapability(C)
//-----------------------------------------------------------------------------

export class PledgeCapability {

    /**
     * To make things more idiomatic, this constructor is used to create a
     * new `PledgeCapability` instead of creating a separate function as
     * defined in the spec. The constructor performs all of the checks
     * defined in NewPromiseCapability. 
     * @param {Function} C A constructor function, presumed to be a Pledge. 
     */
    constructor(C) {

        const executor = (resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        };

        // not used but included for completeness with spec
        executor.capability = this;

        this.pledge = new C(executor);

        if (!isCallable(this.resolve)) {
            throw new TypeError("resolve is not callable.");
        }

        if (!isCallable(this.reject)) {
            throw new TypeError("reject is not callable.");
        }
    }
}

//-----------------------------------------------------------------------------
// 25.6.1.2 PromiseReaction Records
//-----------------------------------------------------------------------------

export class PledgeReaction {
    constructor(capability, type, handler) {
        this.capability = capability;
        this.type = type;
        this.handler = handler;
    }
}

//-----------------------------------------------------------------------------
// 25.6.1.3 CreateResolvingFunctions( promise )
//-----------------------------------------------------------------------------

export function createResolvingFunctions(pledge) {

    const alreadyResolved = { value: false };

    const resolve = resolution => {

        /*
        * Here, the spec says to check that the function has a `promise`
        * property that is an object. We can skip that because this is a
        * closure so we already know what `pledge` should be.
        */

        // if the pledge is already resolved, don't do anything
        if (alreadyResolved.value) {
            return;
        }

        // mark as resolved to avoid further changes
        alreadyResolved.value = true;

        // can't resolve to the same pledge
        if (Object.is(resolution, pledge)) {
            const selfResolutionError = new TypeError("Cannot resolve to self.");
            return rejectPledge(pledge, selfResolutionError);
        }

        if (!isObject(resolution)) {
            return fulfillPledge(pledge, resolution);
        }

        let thenAction;

        /*
         * At this point, we know `resolution` is an object. If the object
         * is a thenable, then we need to wait until the thenable is resolved
         * before resolving the original pledge.
         * 
         * The `try-catch` is because retrieving the `then` property may cause
         * an error if it has a getter and any errors must be caught and used
         * to reject the pledge.
         */
        try {
            thenAction = resolution.then;
        } catch (thenError) {
            return rejectPledge(pledge, thenError);
        }

        // if the thenAction isn't callable then fulfill the pledge
        if (!isCallable(thenAction)) {
            return fulfillPledge(pledge, resolution);
        }

        /*
         * If `thenAction` is callable, then we need to wait for the thenable
         * to resolve before we can resolve this pledge.
         */
        const job = new PledgeResolveThenableJob(pledge, resolution, thenAction);
        hostEnqueuePledgeJob(job);
    };

    /*
    * Included for completeness with the spec but are unnecessary
    * in this implementation due to using a closure to capture these
    * data.
    */
    resolve.pledge = pledge;
    resolve.alreadyResolved = alreadyResolved;

    const reject = reason => {

        /*
         * Here, the spec says to check that the function has a `promise`
         * property that is an object. We can skip that because this is a
         * closure so we already know what `pledge` should be.
         */

        // if the pledge is already resolved, don't do anything
        if (alreadyResolved.value) {
            return;
        }

        // mark as resolved to avoid further changes
        alreadyResolved.value = true;

        return rejectPledge(pledge, reason);
    };

    /*
     * Included for completeness with the spec but are unnecessary
     * in this implementation due to using a closure to capture these
     * data.
     */
    reject.pledge = pledge;
    reject.alreadyResolved = alreadyResolved;

    return {
        resolve,
        reject
    };
}

//-----------------------------------------------------------------------------
// 25.6.1.4 FulfillPromise(promise)
//-----------------------------------------------------------------------------

export function fulfillPledge(pledge, value) {

    if (pledge[PledgeSymbol.state] !== "pending") {
        throw new Error("Pledge is already settled.");
    }

    const reactions = pledge[PledgeSymbol.fulfillReactions];

    pledge[PledgeSymbol.result] = value;
    pledge[PledgeSymbol.fulfillReactions] = undefined;
    pledge[PledgeSymbol.rejectReactions] = undefined;
    pledge[PledgeSymbol.state] = "fulfilled";

    return triggerPledgeReactions(reactions, value);
}

//-----------------------------------------------------------------------------
// 25.6.1.5 NewPromiseCapability(C)
//-----------------------------------------------------------------------------

/*
 * Instead of creating a standalone function for this, I'm using the
 * `Pledge` class constructor.
 */

//-----------------------------------------------------------------------------
// 25.6.1.6 IsPromise(x)
//-----------------------------------------------------------------------------

export function isPledge(x) {
    if (!isObject(x)) {
        return false;
    }

    return PledgeSymbol.state in x;
}

//-----------------------------------------------------------------------------
// 25.6.1.7 RejectPromise(promise, reason)
//-----------------------------------------------------------------------------

export function rejectPledge(pledge, reason) {

    if (pledge[PledgeSymbol.state] !== "pending") {
        throw new Error("Pledge is already settled.");
    }

    const reactions = pledge[PledgeSymbol.rejectReactions];

    pledge[PledgeSymbol.result] = reason;
    pledge[PledgeSymbol.fulfillReactions] = undefined;
    pledge[PledgeSymbol.rejectReactions] = undefined;
    pledge[PledgeSymbol.state] = "rejected";

    // global rejection tracking
    if (pledge[PledgeSymbol.isHandled] === false) {
        hostPledgeRejectionTracker(pledge, "reject");
    }

    return triggerPledgeReactions(reactions, reason);
}

//-----------------------------------------------------------------------------
// 25.6.1.8 TriggerPromiseReactions(reactions, argument)
//-----------------------------------------------------------------------------

export function triggerPledgeReactions(reactions, argument) {

    for (const reaction of reactions) {
        const job = new PledgeReactionJob(reaction, argument);
        hostEnqueuePledgeJob(job);
    }

}

//-----------------------------------------------------------------------------
// 26.6.1.9 HostPromiseRejectionTracker ( promise, operation )
//-----------------------------------------------------------------------------

// everything in this function is not defined in the spec

export function hostPledgeRejectionTracker(pledge, operation) {
    const rejectionTracker = pledge.constructor[PledgeSymbol.rejectionTracker];
    rejectionTracker.track(pledge, operation);
}
