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
class PledgeReaction {
    constructor(capability, type, handler) {
        this.capability = capability;
        this.type = type;
        this.handler = handler;
    }
}

export class PledgeFulfillReaction extends PledgeReaction {
    constructor(capability, handler) {
        super(capability, "Fulfill", handler);
    }
}

export class PledgeRejectReaction extends PledgeReaction {
    constructor(capability, handler) {
        super(capability, "Reject", handler);
    }
}
