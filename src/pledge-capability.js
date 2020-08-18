/**
 * PledgeCapability class
 * @fileoverview A custom promise solution.
 */

//-----------------------------------------------------------------------------
// Imports
//-----------------------------------------------------------------------------


//-----------------------------------------------------------------------------
// Main
//-----------------------------------------------------------------------------

export class PledgeCapability {
    constructor(PledgeConstructor) {
        this.promise = new PledgeConstructor((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}
