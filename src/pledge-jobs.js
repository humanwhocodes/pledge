/**
 * PledgeCapability class
 * @fileoverview A custom promise solution.
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { createResolvingFunctions } from "./pledge.js";

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
    queueMicrotask(() => {
        job.call();
    });
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
                return then.call(thenable, resolve, reject);
            } catch (thenError) {
                reject.call(undefined, thenError);
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
            const { capability, type, handler } = reaction;

            // if there's no handler, just settle the pledge
            if (typeof handler === "undefined") {
                if (type === "fulfill") {
                    capability.resolve(argument);
                } else {
                    capability.reject(argument);
                }
            } else {
                try {
                    const handlerResult = handler(argument);
                    capability.resolve(handlerResult);
                } catch (error) {
                    capability.reject(error);
                }
            }
        };
    }
}
