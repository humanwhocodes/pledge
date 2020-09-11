/**
 * PledgeCapability class
 * @fileoverview A custom promise solution.
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------

import { createResolvingFunctions } from "./pledge.js";

//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

export function hostEnqueuePledgeJob(job) {
    queueMicrotask(() => {
        job.call();
    });
}

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
