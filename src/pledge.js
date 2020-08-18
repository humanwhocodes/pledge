/**
 * Pledge class
 * @fileoverview A custom promise solution.
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { PledgeSymbol } from "./pledge-symbol.js";
import { PledgeCapability } from "./pledge-capability.js";

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

function triggerPledgeReactions(reactions, reason) {

}

function rejectPledge(pledge, reason) {

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

    return triggerPledgeReactions(reactions, reason).
}

function fulfillPledge(pledge, value) {

    if (pledge[PledgeSymbol.state] !== "pending") {
        throw new Error("Pledge is already settled.");
    }

    const reactions = pledge[PledgeSymbol.rejectReactions];

    pledge[PledgeSymbol.result] = value;
    pledge[PledgeSymbol.fulfillReactions] = undefined;
    pledge[PledgeSymbol.rejectReactions] = undefined;
    pledge[PledgeSymbol.state] = "fulfilled";

    return triggerPledgeReactions(reactions, value).
}

function createResolvingFunctions(pledge) {
    
    let alreadyResolved = { value: false };
    
    let resolve = (resolution) => {

        // if the pledge is already resolved, don't do anything
        if (alreadyResolved.value) {
            return;
        }

        // mark as resolved to avoid further changes
        alreadyResolved.value = true;

        // can't resolve to the same pledge
        if (resolution === pledge) {
            const selfResolutionError = new TypeError("Cannot resolve to self.");
            return rejectPledge(pledge, selfResolutionError)
        }
        
        if (typeof resolution !== "object" || resolution === null) {
            return fulfillPledge(pledge, resolution);
        }

        // If we've made it here, `resolution` is an object
        const then = resolution.then;

        // If then is an abrupt completion, then

        // Return RejectPromise(promise, then.[[Value]]).

        const thenAction = then.value;
        if (typeof thenAction !== "function") {
            return fulfillPledge(pledge, resolution);
        }

        const job = () => {
            thenAction.call(then, resolution);
        };
        Let job be NewPromiseResolveThenableJob(promise, resolution, thenAction).
        Perform HostEnqueuePromiseJob(job.[[Job]], job.[[Realm]]).

    };

    resolve.promise = promise;
    resolve.alreadyResolved = alreadyResolved;
    Let alreadyResolved be the Record { [[Value]]: false }.
    Let stepsResolve be the algorithm steps defined in Promise Resolve Functions.
    Let resolve be! CreateBuiltinFunction(stepsResolve, «[[Promise]], [[AlreadyResolved]]»).
    Set resolve.[[Promise]] to promise.
    Set resolve.[[AlreadyResolved]] to alreadyResolved.
    Let stepsReject be the algorithm steps defined in Promise Reject Functions.
    Let reject be! CreateBuiltinFunction(stepsReject, «[[Promise]], [[AlreadyResolved]]»).
    
    reject.promise = promise;
    reject.alreadyResolved = alreadyResolved;
    
    return {
        resolve,
        reject
    };

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

    get [Symbol.species]() {
        return this;
    }

    then(fulfillmentHandler, rejectionHandler) {
        const speciesConstructor = this[Symbol.species];
        const capability = new PledgeCapability(speciesConstructor);
    }

    catch(rejectionHandler) {
        return this.then(null, rejectionHandler);
    }

    finally(settlementHandler) {
        const wrappedHandler = () => settlementHandler();
        return this.then(wrappedHandler, wrappedHandler);
    }
}
