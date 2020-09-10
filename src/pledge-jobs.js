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

export function queuePledgeJob(job) {
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
        this.reaction = reaction;
        this.argument = argument;
    }

    call() {
        const { capability, type, handler } = this.reaction;

        if (typeof handler === "undefined") {
            if (type === "Fulfill") {
                capability.resolve(this.argument);
            } else {
                capability.reject(this.argument);
            }
        } else {
            try {
                const handlerResult = handler(this.argument);
                capability.resolve(handlerResult);
            } catch (error) {
                capability.reject(error);
            }
        }
    }
}
