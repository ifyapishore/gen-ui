import React, { useEffect, useRef, useState } from 'react';
import {type MousePosition, MouseSocketClient} from "./MouseSocketClient.ts";

export const MouseOverlay: React.FC = () => {
    const userId = useRef(Math.random().toString(36).substring(2, 8));
    const [others, setOthers] = useState<Record<string, MousePosition>>({});

    const clientRef = useRef<MouseSocketClient | null>(null);
    const selfUserIdRef = useRef<string>("");

    useEffect(() => {
        if (clientRef.current) return; // ✅ Prevent double init (dev mode)

        const client = new MouseSocketClient('ws://localhost:8080/ws', userId.current);
        clientRef.current = client;
        selfUserIdRef.current = client.getUserId();

        // Handle incoming messages
        client.onMessage((msg) => {
            if (msg.type === 'MousePosition') {
                setOthers((prev) => ({ ...prev, [msg.userId]: msg }));
            }
        });

        // Mouse move handler
        const onMouseMove = (e: MouseEvent) => {
            client.send({
                type: 'MousePosition',
                userId: '', // ← will be auto-filled by MouseSocketClient
                x: e.clientX,
                y: e.clientY,
            });
        };

        window.addEventListener('mousemove', onMouseMove);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            client.destroy();
            clientRef.current = null;
        };
    }, []);

    return (
        <div
            style={{
                pointerEvents: 'none',
                position: 'absolute',
                top: 0,
                left: 0,
                zIndex: 1000,
                width: '100vw',
                height: '100vh',
            }}
        >
            {Object.entries(others).map(([id, pos]) => (
                <svg
                    key={id}
                    style={{
                        position: 'absolute',
                        top: pos.y,
                        left: pos.x,
                        width: 20,
                        height: 20,
                        transform: 'translate(-50%, -50%)',
                    }}
                >
                    <circle cx="10" cy="10" r="5" fill="red" />
                </svg>
            ))}
        </div>
    );
};
