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
// 6.2.3 The Completion Record Specification Type
//-----------------------------------------------------------------------------

export class Completion {
    constructor(type, value, target) {
        this.type = type;
        this.value = value;
        this.target = target;
    }
}

//-----------------------------------------------------------------------------
// 6.2.3.2 NormalCompletion
//-----------------------------------------------------------------------------

export class NormalCompletion extends Completion {
    constructor(argument) {
        super("normal", argument);
    }
}

//-----------------------------------------------------------------------------
// 6.2.3.3 ThrowCompletion
//-----------------------------------------------------------------------------

export class ThrowCompletion extends Completion {
    constructor(argument) {
        super("throw", argument);
    }
}

//-----------------------------------------------------------------------------
// 7.2.3 IsCallable ( argument )
//-----------------------------------------------------------------------------

export function isCallable(argument) {
    return typeof argument === "function";
}

//-----------------------------------------------------------------------------
// 7.2.4 IsConstructor ( argument )
//-----------------------------------------------------------------------------

export function isConstructor(argument) {
    return typeof argument === "function" && typeof argument.prototype !== "undefined";
}
