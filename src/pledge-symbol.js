/**
 * @fileoverview Symbols used for hiding data on pledge objects.
 */

//-----------------------------------------------------------------------------
// 25.6.6 Properties of Promise Instances
//-----------------------------------------------------------------------------

export const PledgeSymbol = Object.freeze({
    state: Symbol("PledgeState"),
    result: Symbol("PledgeResult"),
    isHandled: Symbol("PledgeIsHandled"),
    fulfillReactions: Symbol("PledgeFulfillReactions"),
    rejectReactions: Symbol("PledgeRejectReactions"),
    rejectionTracker: Symbol("PledgeRejectionTracker")
});
