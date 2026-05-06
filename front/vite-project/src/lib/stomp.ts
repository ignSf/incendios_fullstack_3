import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const stompClient = new Client({
  webSocketFactory: () => new SockJS(`${API_URL}/ws`) as WebSocket,
  reconnectDelay: 5000,
  debug: (msg) => {
    if (import.meta.env.DEV) {
      console.log('[STOMP]', msg);
    }
  },
});
