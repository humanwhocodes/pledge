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
        this.pledge = new PledgeConstructor((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
        });
    }
}
