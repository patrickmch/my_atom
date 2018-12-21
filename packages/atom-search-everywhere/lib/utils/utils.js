'use babel';
import hasbin from 'hasbin';

export function delay(duration) {
    return new Promise((resolve, reject) => {
        setTimeout(function () {
            resolve();
        }, duration);
    });
}

export class RequestMerger {
    constructor(delayMs, on) {
        this.ms = delayMs;
        this.on = on;

        this.requestQueue = [];
    }

    push(data) {
        this.requestQueue.push({
            data: data,
            timestamp: Date.now()
        });

        delay(this.ms).then(() => {
            const last = this.requestQueue.length > 0 ? this.requestQueue[this.requestQueue.length - 1] : null;
            if (last && Date.now() - last.timestamp >= this.ms) {
                const requests = this.requestQueue;
                this.requestQueue = [];
                this.on(requests);
            }
        });
    }
}
