/**
 * PledgeCapability class
 * @fileoverview A custom promise solution.
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { createResolvingFunctions } from "./pledge-operations.js";
import { NormalCompletion, ThrowCompletion } from "./utilities.js";

//-----------------------------------------------------------------------------
// 8.4.1 HostEnqueuePromiseJob ( job, realm )
//-----------------------------------------------------------------------------

/**
 * Queues a new pledge job as a microtask to execute later. For simplicity,
 * I've omitted the realm functionality.
 * @param {Function} job The function to execute. 
 * @returns {void}
 */
export function hostEnqueuePledgeJob(job) {
    queueMicrotask(job);
}

//-----------------------------------------------------------------------------
// 25.6.2.2 NewPromiseResolveThenableJob ( promiseToResolve, thenable, then )
//-----------------------------------------------------------------------------

/**
 * Represents a job to resolve a thenable. I opted to use a class here to make
 * it more idiomatic to JavaScript even though the return value is a function.
 */
export class PledgeResolveThenableJob {
    constructor(pledgeToResolve, thenable, then) {
        return () => {
            const { resolve, reject } = createResolvingFunctions(pledgeToResolve);
            
            try {
                // same as thenable.then(resolve, reject)
                then.apply(thenable, [resolve, reject]);
            } catch (thenError) {
                // same as reject(thenError)
                reject.apply(undefined, [thenError]);
            }
        };
    }
}

//-----------------------------------------------------------------------------
// 25.6.2.1 NewPromiseReactionJob ( reaction, argument )
//-----------------------------------------------------------------------------

/**
 * Represents a job to run a reaction. I opted to use a class here to make
 * it more idiomatic to JavaScript even though the return value is a function.
 */
export class PledgeReactionJob {
    constructor(reaction, argument) {
        return () => {
            const { capability: pledgeCapability, type, handler } = reaction;
            let handlerResult;

            if (typeof handler === "undefined") {

                if (type === "fulfill") {
                    handlerResult = new NormalCompletion(argument);
                } else {
                    handlerResult = new ThrowCompletion(argument);
                }
            } else {
                try {
                    handlerResult = new NormalCompletion(handler(argument));
                } catch (error) {
                    handlerResult = new ThrowCompletion(error);
                }
            }

            if (typeof pledgeCapability === "undefined") {
                if (handlerResult instanceof ThrowCompletion) {
                    throw handlerResult.value;
                }

                // Return NormalCompletion(empty)
                return;
            }

            if (handlerResult instanceof ThrowCompletion) {
                pledgeCapability.reject(handlerResult.value);
            } else {
                pledgeCapability.resolve(handlerResult.value);
            }

            // Return NormalCompletion(status)
        };
    }
}
