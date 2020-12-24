/**
 * @fileoverview Rejection Tracker
 */

import { PledgeSymbol } from "./pledge-symbol";

//-----------------------------------------------------------------------------
// 8.1.4.7 Unhandled promise rejections
// https://html.spec.whatwg.org/multipage/webappapis.html#promiserejectionevent
//-----------------------------------------------------------------------------

const canceled = Symbol("canceled");

class PledgeRejectionEvent {
    constructor(pledge, reason) {
        this.pledge = pledge;
        this.reason = reason;
        this[canceled] = false;
    }

    preventDefault() {
        this[canceled] = true;
    }
}


const timeoutId = Symbol("timeoutId");

export class RejectionTracker {

    constructor() {
        this.aboutToBeNotified = new Set();
        this.rejections = new Set();

        this.startMonitor();
    }

    startMonitor() {

        const list = this.aboutToBeNotified;

        this[timeoutId] = setInterval(() => {

            if (list.size === 0) {
                return;
            }

            for (const p of list) {
                if (p[PledgeSymbol.isHandled]) {
                    continue;
                }

                const event = new PledgeRejectionEvent(p, p[PledgeSymbol.result]);
                p.constructor.onUnhandledRejection(event);

                const notHandled = !event[canceled];

                if (notHandled) {
                    this.outstandingRejections.add(p);
                    
                    // what to do here?

                    throw new Error(`Pledge rejection was not caught: ${ p[PledgeSymbol.result] }`);
                }
            }
        }, 500);
    }

    stopMonitor() {
        clearInterval(this[timeoutId]);
    }

    track(pledge, operation) {
        if (operation === "reject") {
            this.aboutToBeNotified.add(pledge);
        }

        if (operation === "handle") {
            if (this.aboutToBeNotified.has(pledge)) {
                this.aboutToBeNotified.delete(pledge);
                return;
            }

            if (!this.outstandingRejections.has(pledge)) {
                return;
            }

            this.outstandingRejections.delete(pledge);

            setTimeout(() => {
                const event = new PledgeRejectionEvent(pledge, pledge[PledgeSymbol.result]);
                pledge.constructor.onRejectionHandled(event);
            }, 0);
        }
    }
}
