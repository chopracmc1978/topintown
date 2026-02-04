/**
 * Direct TCP printing for native Android/iOS apps via Capacitor
 * 
 * This module attempts to send ESC/POS data directly to thermal printers
 * using raw TCP sockets. This only works in native Capacitor apps.
 * 
 * For web browsers, printing is not supported without a bridge server.
 */

import { Capacitor } from '@capacitor/core';

export interface PrinterConfig {
  ip: string;
  port: number;
  name?: string;
}

const withTimeout = async <T>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
  let timeoutId: number | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
};

/**
 * Check if we're running in a native Capacitor environment
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Convert string to base64 for transmission
 */
const stringToBase64 = (str: string): string => {
  // Handle binary ESC/POS data properly
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

/**
 * Send raw ESC/POS data to a thermal printer via direct TCP connection
 * 
 * This uses XMLHttpRequest to connect to the printer's raw socket interface.
 * Note: This approach only works in native apps, not in browsers.
 */
export const sendToPrinterDirect = async (
  printer: PrinterConfig,
  data: string
): Promise<{ success: boolean; error?: string }> => {
  // Check if running in native environment
  if (!isNativePlatform()) {
    return {
      success: false,
      error: 'Direct TCP printing only available in native app',
    };
  }

  try {
    console.log(`[DirectPrint] Sending to ${printer.ip}:${printer.port}`);

    // 1) Preferred: native TCP socket plugin
    try {
      await withTimeout(sendViaNativeSocket(printer.ip, printer.port, data), 7000, 'TCP connection timeout');
      return { success: true };
    } catch (tcpError) {
      // 2) Fallback: WebSocket (rare; some printer gateways support ws://)
      try {
        await withTimeout(sendViaWebSocket(printer.ip, printer.port, data), 7000, 'WebSocket connection timeout');
        return { success: true };
      } catch (wsError) {
        const tcpMsg = tcpError instanceof Error ? tcpError.message : String(tcpError);
        const wsMsg = wsError instanceof Error ? wsError.message : String(wsError);
        throw new Error(`TCP failed: ${tcpMsg}. WebSocket failed: ${wsMsg}`);
      }
    }
  } catch (error) {
    console.error('[DirectPrint] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Send data via native Android/iOS socket
 * Uses Capacitor's native bridge to access raw TCP sockets
 */
const sendViaNativeSocket = async (
  ip: string,
  port: number,
  data: string
): Promise<void> => {
  // Best supported path in this app: capacitor-tcp-socket
  try {
    const mod = await import('capacitor-tcp-socket');
    const TcpSocket = mod.TcpSocket;
    const DataEncoding = mod.DataEncoding;

    const connection = await TcpSocket.connect({ ipAddress: ip, port });
    try {
      await TcpSocket.send({
        client: connection.client,
        data: stringToBase64(data),
        encoding: DataEncoding.BASE64,
      });
    } finally {
      try {
        await TcpSocket.disconnect({ client: connection.client });
      } catch {
        // ignore disconnect errors
      }
    }
    return;
  } catch (e) {
    // Continue to legacy fallbacks below
  }

  // Check if the native TCP plugin is available
  if (typeof (window as any).CapacitorTCP !== 'undefined') {
    const TCP = (window as any).CapacitorTCP;
    
    const connection = await TCP.connect({ host: ip, port });
    await TCP.write({ 
      connectionId: connection.connectionId, 
      data: stringToBase64(data) 
    });
    await TCP.disconnect({ connectionId: connection.connectionId });
    return;
  }
  
  // Try the socket-forward plugin if available
  if (typeof (window as any).Capacitor?.Plugins?.SocketForward !== 'undefined') {
    const SocketForward = (window as any).Capacitor.Plugins.SocketForward;
    await SocketForward.sendTcp({ host: ip, port, data: stringToBase64(data) });
    return;
  }
  
  // Fallback: Try using Android's intent system to print
  // This works with many thermal printer Android apps
  if (Capacitor.getPlatform() === 'android') {
    // Use Android broadcast intent for ESC/POS printing
    // Many POS Android systems support this
    const { App } = await import('@capacitor/app');
    
    // Store print data in a temporary way that native code can access
    try {
      localStorage.setItem('__pending_print', JSON.stringify({
        ip,
        port,
        data: stringToBase64(data),
        timestamp: Date.now()
      }));
      
      // Dispatch a custom event that native code can listen for
      window.dispatchEvent(new CustomEvent('direct-print-request', {
        detail: { ip, port, data: stringToBase64(data) }
      }));
      
      // Give native layer time to process
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return;
    } catch (e) {
      // Continue to WebSocket fallback
    }
  }
  
  throw new Error('No native TCP plugin available');
};

/**
 * Send data via WebSocket (some network printers support this)
 */
const sendViaWebSocket = async (
  ip: string,
  port: number,
  data: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Some printers accept WebSocket connections on their raw port
      const ws = new WebSocket(`ws://${ip}:${port}`);
      
      ws.onopen = () => {
        // Convert string to ArrayBuffer for binary transmission
        const encoder = new TextEncoder();
        const bytes = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
          bytes[i] = data.charCodeAt(i) & 0xff;
        }
        ws.send(bytes.buffer);
        
        setTimeout(() => {
          ws.close();
          resolve();
        }, 500);
      };
      
      ws.onerror = (error) => {
        ws.close();
        reject(new Error('WebSocket connection failed'));
      };
      
      ws.onclose = () => {
        // Connection closed
      };
      
      // Timeout
      setTimeout(() => {
        if (ws.readyState !== WebSocket.CLOSED) {
          ws.close();
          reject(new Error('WebSocket timeout'));
        }
      }, 5000);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Test printer connection
 */
export const testPrinterConnection = async (
  printer: PrinterConfig
): Promise<{ success: boolean; error?: string }> => {
  // Send a simple test print
  const testData = `
\x1B@
\x1Ba\x01
\x1BE\x01TEST PRINT\x1BE\x00

\x1Ba\x00
Printer: ${printer.name || 'Unknown'}
IP: ${printer.ip}
Port: ${printer.port}
Time: ${new Date().toLocaleTimeString()}
--------------------------------
If you see this, printing works!
--------------------------------

\x1Bd\x03
\x1DVA
`;
  
  return sendToPrinterDirect(printer, testData);
};

/**
 * Open cash drawer via ESC/POS command
 * Standard command: ESC p m t1 t2
 * - ESC p (1B 70) = cash drawer kick
 * - m = pin (0 or 1)
 * - t1, t2 = pulse timing
 */
export const openCashDrawer = async (
  printer: PrinterConfig
): Promise<{ success: boolean; error?: string }> => {
  // ESC/POS cash drawer kick command
  // Pin 2 (drawer 1): \x1B\x70\x00\x19\xFA
  // Pin 5 (drawer 2): \x1B\x70\x01\x19\xFA
  const drawerCommand = '\x1B\x70\x00\x19\xFA';
  
  return sendToPrinterDirect(printer, drawerCommand);
};
