import type { CapturedRequest } from '@shared/types';

interface PostmanCollection {
  info: {
    name: string;
    schema: string;
  };
  item: PostmanItem[];
}

interface PostmanItem {
  name: string;
  request: {
    method: string;
    header: PostmanHeader[];
    url: {
      raw: string;
      protocol: string;
      host: string[];
      path: string[];
      query: { key: string; value: string }[];
    };
    body?: {
      mode: 'raw';
      raw: string;
      options: {
        raw: {
          language: string;
        };
      };
    };
  };
  response: any[];
}

interface PostmanHeader {
  key: string;
  value: string;
  type: 'text';
}

export function generatePostmanCollection(requests: CapturedRequest[], name = 'Trafexia Export'): string {
  const collection: PostmanCollection = {
    info: {
      name: name,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: requests.map(req => convertToPostmanItem(req))
  };

  return JSON.stringify(collection, null, 2);
}

function convertToPostmanItem(req: CapturedRequest): PostmanItem {
  // Parse URL
  let protocol = 'http';
  let host: string[] = [];
  let path: string[] = [];
  let query: { key: string; value: string }[] = [];

  try {
    const urlObj = new URL(req.url);
    protocol = urlObj.protocol.replace(':', '');
    host = urlObj.hostname.split('.');
    path = urlObj.pathname.split('/').filter(p => p);
    urlObj.searchParams.forEach((value, key) => {
      query.push({ key, value });
    });
  } catch (e) {
    // Fallback if URL parsing fails
    host = [req.host];
    path = [req.path];
  }

  // Headers
  const header: PostmanHeader[] = Object.entries(req.requestHeaders).map(([key, value]) => ({
    key,
    value: String(value),
    type: 'text'
  }));

  // Body
  let body: any = undefined;
  if (req.requestBody) {
    body = {
      mode: 'raw',
      raw: req.requestBody,
      options: {
        raw: {
          language: detectLanguage(req.requestHeaders['content-type'] || '')
        }
      }
    };
  }

  return {
    name: `${req.method} ${req.path}`,
    request: {
      method: req.method,
      header,
      url: {
        raw: req.url,
        protocol,
        host,
        path,
        query
      },
      body
    },
    response: []
  };
}


function detectLanguage(contentType: string): string {
  const lower = contentType.toLowerCase();
  if (lower.includes('application/json')) return 'json';
  if (lower.includes('application/xml')) return 'xml';
  if (lower.includes('text/html')) return 'html';
  if (lower.includes('javascript')) return 'javascript';
  return 'text';
}


export function generatePostmanFromUrls(urls: string[], name = 'Trafexia Static Analysis'): string {
  // Define categories and their keywords
  const categories: Record<string, string[]> = {
    'Authentication & User': ['auth', 'login', 'logout', 'register', 'signin', 'signup', 'user', 'profile', 'account', 'token', 'otp', 'password'],
    'Product & Catalog': ['product', 'sku', 'category', 'catalog', 'search', 'find', 'item', 'detail', 'listing'],
    'Cart & Checkout': ['cart', 'basket', 'checkout', 'add-to-cart', 'remove', 'shipping', 'delivery'],
    'Order & Payment': ['order', 'pay', 'payment', 'transaction', 'invoice', 'billing', 'receipt', 'history', 'purchase'],
    'Promotion & Voucher': ['promo', 'coupon', 'voucher', 'discount', 'campaign', 'reward', 'offer', 'gift'],
    'Notification & Message': ['notify', 'notification', 'message', 'inbox', 'chat', 'push', 'alert'],
    'Config & Settings': ['config', 'setting', 'pref', 'feature', 'version', 'update', 'meta', 'system'],
    'Upload & Media': ['upload', 'file', 'image', 'video', 'cloud', 'storage', 'cdn', 'media'],
    'Location & Map': ['geo', 'location', 'map', 'place', 'address', 'city', 'country', 'region']
  };

  // Prepare folder structure
  const folders: Record<string, PostmanItem[]> = {};
  Object.keys(categories).forEach(cat => folders[cat] = []);
  folders['Uncategorized'] = [];

  // Helper to create item
  const createItem = (url: string): PostmanItem => {
    let protocol = 'http';
    let host: string[] = [];
    let path: string[] = [];
    let query: { key: string; value: string }[] = [];

    try {
      const urlObj = new URL(url);
      protocol = urlObj.protocol.replace(':', '');
      host = urlObj.hostname.split('.');
      path = urlObj.pathname.split('/').filter(p => p);
      urlObj.searchParams.forEach((value, key) => {
        query.push({ key, value });
      });
    } catch (e) {
      host = [url];
    }

    return {
      name: path.length > 0 ? `/${path.join('/')}` : url, // Use path as name for cleaner look
      request: {
        method: 'GET',
        header: [],
        url: {
          raw: url,
          protocol,
          host,
          path,
          query
        }
      },
      response: []
    };
  };

  urls.forEach(url => {
    const lowerUrl = url.toLowerCase();
    let matched = false;

    // Try to match keywords
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(k => lowerUrl.includes(k))) {
        folders[category].push(createItem(url));
        matched = true;
        break; // Assign to first matching category (priority based on object order)
      }
    }

    if (!matched) {
      folders['Uncategorized'].push(createItem(url));
    }
  });

  // Build final item array
  const items: any[] = [];
  
  Object.entries(folders).forEach(([name, requests]) => {
    if (requests.length > 0) {
      if (name === 'Uncategorized') {
        // Add uncategorized directly to root or folder? User showed folders.
        // Let's put them in a folder too for cleanliness if there are many.
        items.push({
          name: 'Other APIs',
          item: requests
        });
      } else {
        items.push({
          name: name,
          item: requests
        });
      }
    }
  });

  const collection: PostmanCollection = {
    info: {
      name: name,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: items
  };

  return JSON.stringify(collection, null, 2);
}

