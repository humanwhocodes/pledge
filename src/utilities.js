/**
 * @fileoverview Misc utilities
 */

//-----------------------------------------------------------------------------
// Helpers not in ECMA-262
//-----------------------------------------------------------------------------


export function isObject(argument) {
    const type = typeof argument;
    return ((type === "object") && (argument !== null)) || type === "function";
}


//-----------------------------------------------------------------------------
// 7.2.3 IsCallable ( argument )
//-----------------------------------------------------------------------------

export function isCallable(argument) {
    return typeof argument === "function";
}


//-----------------------------------------------------------------------------
// 6.2.3.2 NormalCompletion
//-----------------------------------------------------------------------------

export class NormalCompletion {
    constructor(argument) {
        this.type = "normal";
        this.value = argument;
        this.target = undefined;
    }
}

//-----------------------------------------------------------------------------
// 6.2.3.3 ThrowCompletion
//-----------------------------------------------------------------------------

export class ThrowCompletion {
    constructor(argument) {
        this.type = "throw";
        this.value = argument;
        this.target = undefined;
    }
}
