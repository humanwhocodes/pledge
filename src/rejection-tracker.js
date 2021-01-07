/**
 * @fileoverview Rejection Tracker
 */

import { PledgeSymbol } from "./pledge-symbol";

//-----------------------------------------------------------------------------
// 8.1.4.7 Unhandled promise rejections
// https://html.spec.whatwg.org/multipage/webappapis.html#promiserejectionevent
//-----------------------------------------------------------------------------

class PledgeRejectionEvent {
    constructor(pledge, reason) {
        this.pledge = pledge;
        this.reason = reason;
        this.returnValue = true;
    }

    preventDefault() {
        this.returnValue = false;
    }
}

export class RejectionTracker {

    constructor(logger = console) {
        
        /**
         * This set keeps track of pledges that were rejected but were not
         * handled. All pledges in this set will trigger onUnhandledRejection
         * if they are still there during the monitoring phase of the
         * rejection tracking.
         * @type Set
         * @property aboutToBeNotified
         */
        this.aboutToBeNotified = new Set();

        /**
         * This set keeps track of pledges that were unhandled, triggered
         * onUnhandledRejection, and then had a rejection handler added. These
         * pledges will trigger onRejectionHandled.
         * @type WeakSet
         * @property outstandingRejections
         */
        this.outstandingRejections = new WeakSet();

        /**
         * A logger used to output unhandled pledge rejection notices. This
         * can be overwritten for easier testing but otherwise is console.
         * @type console
         * @property logger
         */
        this.logger = logger;

        /**
         * Tracks the interval identifier for monitoring pledges.
         * @type int
         * @property timeoutId
         */
        this.timeoutId = 0;
    }

    startMonitor() {

        // only start monitor once
        if (this.timeoutId > 0) {
            return;
        }

        this.timeoutId = setInterval(() => {

            const list = this.aboutToBeNotified;

            this.aboutToBeNotified = new Set();

            if (list.size === 0) {
                this.stopMonitor();
                return;
            }

            for (const p of list) {
                if (p[PledgeSymbol.isHandled]) {
                    continue;
                }

                const event = new PledgeRejectionEvent(p, p[PledgeSymbol.result]);
                p.constructor.onUnhandledRejection(event);

                /*
                 * In the browser, "not handled" is a term that means both that
                 * the promise hasn't been handled and that the event handler
                 * did not cancel the event.
                 */
                const notHandled = event.returnValue;

                /*
                 * The onUnhandledRejection handler might have added a rejection
                 * handler, so we need to double-check here.
                 */
                if (p[PledgeSymbol.isHandled] === false) {
                    this.outstandingRejections.add(p);
                }
                
                if (notHandled) {
                    this.logger.error(`Pledge rejection was not caught: ${ p[PledgeSymbol.result] }`);
                }
            }
        }, 100);
    }

    stopMonitor() {
        clearInterval(this.timeoutId);
        this.timeoutId = 0;
    }

    track(pledge, operation) {

        // the pledge has no rejection handler so we might need to log it
        if (operation === "reject") {
            this.aboutToBeNotified.add(pledge);
        }

        // the pledge was unhandled but now is handled
        if (operation === "handle") {

            /*
             * If the pledge was going to trigger onUnhandledRejection, remove
             * it from the list so that doesn't happen.
             */
            if (this.aboutToBeNotified.has(pledge)) {
                this.aboutToBeNotified.delete(pledge);
                return;
            }

            /*
             * If the pledge isn't already flagged to trigger
             * onRejectionHandled, then there's nothing else we need to do.
             */
            if (!this.outstandingRejections.has(pledge)) {
                return;
            }
            
            /*
             * If we made it here, the pledge was already flagged to trigger
             * onRejectionHandled, so remove it and trigger the event.
             */
            this.outstandingRejections.delete(pledge);

            setTimeout(() => {
                const event = new PledgeRejectionEvent(pledge, pledge[PledgeSymbol.result]);
                pledge.constructor.onRejectionHandled(event);
            }, 0);            
        }

        // not part of spec, need to toggle monitoring
        if (this.aboutToBeNotified.size > 0) {
            this.startMonitor();
        } else {
            this.stopMonitor();
        }

    }
}
