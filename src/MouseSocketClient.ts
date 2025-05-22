export interface MousePosition {
    type: 'MousePosition';
    userId: string;
    x: number;
    y: number;
    meta?: Record<string, string>;
}

type Message = MousePosition;

export class MouseSocketClient {
    private ws: WebSocket | null = null;
    private readonly url: string;
    private readonly userId: string;
    private readonly listeners: ((msg: MousePosition) => void)[] = [];

    private reconnectDelay = 1000;
    private connected = false;
    private destroyed = false;

    private outputQueue: string[] = [];
    private queueRunning = false;

    constructor(url: string, userId?: string) {
        this.url = url;
        this.userId = userId || Math.random().toString(36).substring(2, 8);
        this.connect();
        this.runQueueLoop();
    }

    private connect() {
        if (this.destroyed) return;

        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            this.connected = true;
        };

        this.ws.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data) as Message;
                this.listeners.forEach((fn) => fn(msg));
            } catch {}
        };

        this.ws.onclose = () => {
            this.connected = false;
            if (!this.destroyed) {
                setTimeout(() => this.connect(), this.reconnectDelay);
            }
        };
    }

    private async runQueueLoop() {
        if (this.queueRunning) return;
        this.queueRunning = true;

        while (!this.destroyed) {
            if (!this.connected || this.ws?.readyState !== WebSocket.OPEN) {
                await this.sleep(100); // Wait before retrying if not connected
                continue;
            }

            const msg = this.outputQueue.shift();
            if (msg) {
                try {
                    this.ws.send(msg);
                } catch (e) {
                    this.outputQueue.unshift(msg); // Re-queue on failure
                    await this.sleep(200); // Delay to prevent tight loop
                }
            } else {
                await this.sleep(50); // Wait when no messages
            }
        }

        this.queueRunning = false;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    send(msg: Message) {
        msg.userId = this.userId;
        const str = JSON.stringify(msg);
        this.outputQueue.push(str);
    }

    onMessage(fn: (msg: Message) => void) {
        this.listeners.push(fn);
    }

    destroy() {
        this.destroyed = true;
        this.ws?.close();
        this.ws = null;
    }

    getUserId(): string {
        return this.userId;
    }
}
