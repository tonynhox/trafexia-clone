import * as http from 'http';
import * as https from 'https';
import { URL } from 'url';
import type { ComposedRequest, CapturedRequest } from '../../../shared/types';

export class RequestComposer {
  private requestIdCounter = 1000000; // Start from high number to avoid conflicts

  /**
   * Send a composed/custom HTTP request
   */
  async sendRequest(composedRequest: ComposedRequest): Promise<CapturedRequest> {
    const startTime = Date.now();
    const requestId = this.requestIdCounter++;

    return new Promise((resolve, reject) => {
      try {
        const parsedUrl = new URL(composedRequest.url);
        const isHttps = parsedUrl.protocol === 'https:';
        const httpModule = isHttps ? https : http;

        // Parse headers
        const headers = { ...composedRequest.headers };
        
        // Add content-length if body exists
        if (composedRequest.body) {
          headers['content-length'] = Buffer.byteLength(composedRequest.body).toString();
        }

        // Request options
        const requestOptions: https.RequestOptions = {
          method: composedRequest.method,
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || (isHttps ? 443 : 80),
          path: parsedUrl.pathname + parsedUrl.search,
          headers,
          // For HTTPS, disable certificate validation for testing
          rejectUnauthorized: false,
        } as https.RequestOptions;

        const clientRequest = httpModule.request(requestOptions, (incomingMessage) => {
          const chunks: Buffer[] = [];

          incomingMessage.on('data', (chunk: Buffer) => {
            chunks.push(chunk);
          });

          incomingMessage.on('end', () => {
            const responseBody = Buffer.concat(chunks).toString('utf8');
            const duration = Date.now() - startTime;

            // Build response headers
            const responseHeaders: Record<string, string> = {};
            for (const [key, value] of Object.entries(incomingMessage.headers)) {
              if (typeof value === 'string') {
                responseHeaders[key.toLowerCase()] = value;
              } else if (Array.isArray(value)) {
                responseHeaders[key.toLowerCase()] = value.join(', ');
              }
            }

            const capturedRequest: CapturedRequest = {
              id: requestId,
              timestamp: startTime,
              method: composedRequest.method,
              url: composedRequest.url,
              host: parsedUrl.hostname,
              path: parsedUrl.pathname + parsedUrl.search,
              status: incomingMessage.statusCode || 0,
              requestHeaders: composedRequest.headers,
              requestBody: composedRequest.body || null,
              responseHeaders,
              responseBody: responseBody || null,
              contentType: responseHeaders['content-type'] || 'text/plain',
              duration,
              size: responseBody.length,
            };

            resolve(capturedRequest);
          });
        });

        clientRequest.on('error', (error) => {
          reject(new Error(`Request failed: ${error.message}`));
        });

        // Send request body if exists
        if (composedRequest.body) {
          clientRequest.write(composedRequest.body);
        }

        clientRequest.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Replay a captured request
   */
  async replayRequest(originalRequest: CapturedRequest): Promise<CapturedRequest> {
    const composedRequest: ComposedRequest = {
      method: originalRequest.method,
      url: originalRequest.url,
      headers: { ...originalRequest.requestHeaders },
      body: originalRequest.requestBody || undefined,
    };

    return this.sendRequest(composedRequest);
  }
}
