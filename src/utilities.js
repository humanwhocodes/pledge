/**
 * @fileoverview Misc utilities
 */

//-----------------------------------------------------------------------------
// Helpers
//-----------------------------------------------------------------------------

export function isObject(argument) {
    const type = typeof argument;
    return ((type === "object") && (argument !== null)) || type === "function";
}

export function isCallable(argument) {
    return typeof argument === "function";
}

export function sameValue(x, y) {
    return Object.is(x, y);
}
