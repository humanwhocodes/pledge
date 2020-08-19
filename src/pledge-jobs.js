/**
 * PledgeCapability class
 * @fileoverview A custom promise solution.
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------


//-----------------------------------------------------------------------------
// Exports
//-----------------------------------------------------------------------------

export function queuePledgeJob(job) {
    queueMicrotask(() => {
        job.call();
    });
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
