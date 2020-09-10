/**
 * @fileoverview ECMA-262 25.6.1 Promise Abstract Operations.
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { PledgeSymbol } from "./pledge-symbol.js";
import { PledgeResolveThenableJob, queuePledgeJob } from "./pledge-jobs.js";

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

export function assertIsPledge(value) {
    if (!isPledge(value)) {
        throw new TypeError("Value must be an instance of Pledge.");
    }
}

//-----------------------------------------------------------------------------
// 25.6.1.1 PromiseCapability Records
//-----------------------------------------------------------------------------

export class PledgeCapability {
    constructor(PledgeConstructor) {
        this.pledge = new PledgeConstructor((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}

//-----------------------------------------------------------------------------
// 25.6.1.2 PromiseReaction Records
//-----------------------------------------------------------------------------

class PledgeReaction {
    constructor(capability, type, handler) {
        this.capability = capability;
        this.type = type;
        this.handler = handler;
    }
}

export class PledgeFulfillReaction extends PledgeReaction {
    constructor(capability, handler) {
        super(capability, "fulfill", handler);
    }
}

export class PledgeRejectReaction extends PledgeReaction {
    constructor(capability, handler) {
        super(capability, "reject", handler);
    }
}

//-----------------------------------------------------------------------------
// 25.6.1.3 CreateResolvingFunctions(promise)
//-----------------------------------------------------------------------------

export function createResolvingFunctions(pledge) {

    let alreadyResolved = { value: false };

    let resolve = resolution => {

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
        if (resolution === pledge) {
            const selfResolutionError = new TypeError("Cannot resolve to self.");
            return rejectPledge(pledge, selfResolutionError);
        }

        if (typeof resolution !== "object" || resolution === null) {
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
        if (typeof thenAction !== "function") {
            return fulfillPledge(pledge, resolution);
        }

        /*
         * If `thenAction` is callable, then we need to wait for the thenable
         * to resolve before we can resolve this pledge.
         */
        let job = new PledgeResolveThenableJob(pledge, resolution, thenAction);
        queuePledgeJob(job);
    };

    resolve.pledge = pledge;
    resolve.alreadyResolved = alreadyResolved;

    let reject = reason => {

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

    const reactions = pledge[PledgeSymbol.rejectReactions];

    pledge[PledgeSymbol.result] = value;
    pledge[PledgeSymbol.fulfillReactions] = undefined;
    pledge[PledgeSymbol.rejectReactions] = undefined;
    pledge[PledgeSymbol.state] = "fulfilled";

    return triggerPledgeReactions(reactions, value);
}

//-----------------------------------------------------------------------------
// 25.6.1.5 NewPromiseCapability(C)
//-----------------------------------------------------------------------------

// TODO

//-----------------------------------------------------------------------------
// 25.6.1.6 IsPromise(x)
//-----------------------------------------------------------------------------

export function isPledge(value) {
    if (typeof value !== "object" && value !== null) {
        return false;
    }

    return PledgeSymbol.state in value;
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
    if (!pledge[PledgeSymbol.isHandled]) {
        // TODO: perform HostPromiseRejectionTracker(promise, "reject").
    }

    return triggerPledgeReactions(reactions, reason);
}

//-----------------------------------------------------------------------------
// 25.6.1.8 TriggerPromiseReactions(reactions, argument)
//-----------------------------------------------------------------------------

export function triggerPledgeReactions(reactions, argument) {
    // TODO
}

//-----------------------------------------------------------------------------
// 25.6.1.9 HostPromiseRejectionTracker(promise, operation)
//-----------------------------------------------------------------------------

// TODO
