// ------------------- LRU缓存实现 -------------------
class Node {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

class LRUCache {
  constructor(limit) {
    this.limit = limit;
    this.size = 0;
    this.cache = new Map();
    this.head = null;
    this.tail = null;
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const node = this.cache.get(key);
    this._moveToHead(node);
    return node.value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      const node = this.cache.get(key);
      node.value = value;
      this._moveToHead(node);
    } else {
      const newNode = new Node(key, value);
      this.cache.set(key, newNode);
      this._addNode(newNode);

      if (this.size > this.limit) {
        this._removeTail();
      }
    }
  }

  _addNode(node) {
    if (this.head) {
      node.next = this.head;
      this.head.prev = node;
    }
    this.head = node;
    if (!this.tail) {
      this.tail = node;
    }
    this.size++;
  }

  _removeNode(node) {
    const { prev, next } = node;
    if (prev) prev.next = next;
    if (next) next.prev = prev;

    if (node === this.head) this.head = next;
    if (node === this.tail) this.tail = prev;

    node.prev = null;
    node.next = null;
    this.cache.delete(node.key);
    this.size--;
  }

  _moveToHead(node) {
    this._removeNode(node);
    this._addNode(node);
  }

  _removeTail() {
    if (this.tail) {
      this._removeNode(this.tail);
    }
  }

  has(key) {
    return this.cache.has(key);
  }

  size() {
    return this.size;
  }
}

// ------------------- 请求频率限制器 -------------------
class RateLimiter {
  constructor(limit, interval) {
    this.limit = limit;
    this.interval = interval;
    this.clients = new Map();
  }

  isAllowed(ip) {
    const now = Date.now();
    if (!this.clients.has(ip)) {
      this.clients.set(ip, { count: 1, lastRequest: now });
      return true;
    }

    const client = this.clients.get(ip);
    if (now - client.lastRequest > this.interval) {
      client.count = 1;
      client.lastRequest = now;
      return true;
    }

    if (client.count < this.limit) {
      client.count += 1;
      client.lastRequest = now;
      return true;
    }

    return false;
  }
}

// ------------------- DNS查询统计 -------------------
const dnsStats = {
  cloudflare: { queries: 0, success: 0, failures: 0, totalTime: 0 },
  google: { queries: 0, success: 0, failures: 0, totalTime: 0 },
  opendns: { queries: 0, success: 0, failures: 0, totalTime: 0 }
};

// ------------------- IP过滤函数 -------------------
function isAllowedIP(ip) {
  // 例如：允许的IP范围，可以根据实际情况调整
  let allowedRanges = ['0/254.0/255.0/255.0/255', '255.0/255.0/255.0/255'];
  return allowedRanges.some(range => ipInRange(ip, range));
}

function ipInRange(ip, range) {
  let [rangeIp, prefix] = range.split('/');
  let mask = ~(2 ** (32 - prefix) - 1);
  return (ipToInt(ip) & mask) === (ipToInt(rangeIp) & mask);
}

function ipToInt(ip) {
  return ip.split('.').reduce((int, oct) => (int << 8) + parseInt(oct, 10), 0);
}

// ------------------- 格式化响应 -------------------
function formatResponse(result, format) {
  if (format === 'text') {
    return new Response(result.answer.map(r => r.data).join(', '), { status: 200 });
  } else {
    return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
}

// ------------------- 日志记录函数 -------------------
function logRequest(ip, name, type, result) {
  console.log(`IP: ${ip}, Name: ${name}, Type: ${type}, Result: ${JSON.stringify(result)}`);
}

// ------------------- 超时处理函数 -------------------
function timeoutPromise(promise, ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject(new Error('Timeout')), ms);
    promise.then(resolve, reject);
  });
}

// ------------------- 重试机制 -------------------
async function retryDNS(dnsPromise, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await dnsPromise;
    } catch (e) {
      if (i === retries - 1) throw e;
    }
  }
}

// ------------------- 共识计算函数 -------------------
function calculateConsensusResult(results) {
  let resultCount = {};
  let consensusResult = null;

  results.forEach(result => {
    let key = JSON.stringify(result);
    resultCount[key] = (resultCount[key] || 0) + 1;

    if (resultCount[key] >= 2) {  // 达到2/3的共识
      consensusResult = result;
    }
  });

  return consensusResult;
}

// ------------------- DNS 查询函数 -------------------
async function fetchDNSFromService(name, type, dnsServer, serverName) {
  let start = Date.now();
  dnsStats[serverName].queries += 1;
  try {
    let queryUrl = `https://${dnsServer}/dns-query?name=${name}&type=${type}`;
    let response = await fetch(queryUrl, {
      headers: {
        'Accept': 'application/dns-json'
      }
    });

    if (!response.ok) {
      throw new Error(`DNS query failed with status ${response.status}`);
    }

    let data = await response.json();
    dnsStats[serverName].success += 1;
    dnsStats[serverName].totalTime += Date.now() - start;
    return data;
  } catch (e) {
    dnsStats[serverName].failures += 1;
    throw e;
  }
}

// ------------------- 主函数 -------------------
export default {
  async fetch(req, env, ctx) {
    try {
      let url = new URL(req.url);
      let dnsName = url.searchParams.get('name');
      let dnsType = url.searchParams.get('type') || 'A';
      let format = url.searchParams.get('format') || 'json';
      let ttl = parseInt(url.searchParams.get('ttl')) || 3600;

      // IP过滤功能
      let clientIP = req.headers.get('CF-Connecting-IP');
      if (!isAllowedIP(clientIP)) {
        return new Response('Forbidden', { status: 403 });
      }

      // 请求频率限制
      if (!rateLimiter.isAllowed(clientIP)) {
        return new Response('Too Many Requests', { status: 429 });
      }

      if (!dnsName) {
        return new Response('Query name is required', { status: 400 });
      }

      // 高级缓存策略（LRU缓存）
      let cacheKey = `${dnsName}:${dnsType}`;
      let cacheResult = dnsCache.get(cacheKey);
      if (cacheResult) {
        return formatResponse(cacheResult, format);
      }

      // 并行发出DNS请求
      let cloudflareDNS = fetchDNSFromService(dnsName, dnsType, '1.1.1.1', 'cloudflare');
      let googleDNS = fetchDNSFromService(dnsName, dnsType, '8.8.8.8', 'google');
      let openDNS = fetchDNSFromService(dnsName, dnsType, '208.67.222.222', 'opendns');

      // 返回最快的结果
      let firstResultPromise = Promise.race([cloudflareDNS, googleDNS, openDNS]);
      let firstResult = await firstResultPromise;

      // 日志记录
      logRequest(clientIP, dnsName, dnsType, firstResult);

      // 向用户返回第一个结果
      let initialResponse = formatResponse(firstResult, format);
      ctx.waitUntil(initialResponse.clone());

      // 在1秒内等待其余两个结果
      let remainingResults = await Promise.allSettled([
        timeoutPromise(cloudflareDNS, 1000),
        timeoutPromise(googleDNS, 1000),
        timeoutPromise(openDNS, 1000)
      ]);

      // 过滤成功的结果
      let successfulResults = remainingResults
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);

      // 计算共识结果
      let finalResult = calculateConsensusResult([firstResult, ...successfulResults]);

      // 如果三者结果不同，则再次请求
      if (!finalResult) {
        remainingResults = await Promise.allSettled([
          retryDNS(cloudflareDNS),
          retryDNS(googleDNS),
          retryDNS(openDNS)
        ]);
        successfulResults = remainingResults
          .filter(r => r.status === 'fulfilled')
          .map(r => r.value);
        finalResult = calculateConsensusResult(successfulResults);

        // 如果仍然不一致，则选择信任Cloudflare的结果
        if (!finalResult) {
          finalResult = await cloudflareDNS;
        }
      }

      // 缓存结果
      dnsCache.set(cacheKey, finalResult);

      return formatResponse(finalResult, format);

    } catch (e) {
      return new Response(`DNS query failed: ${e.message}`, { status: 500 });
    }
  }
};

// 初始化全局缓存实例
const dnsCache = new LRUCache(1000);

// 初始化全局频率限制实例
const rateLimiter = new RateLimiter(60, 60000); // 每分钟60个请求

// ------------------- 查询统计接口 -------------------
export const dnsStatsHandler = {
  async fetch(req, env, ctx) {
    return new Response(JSON.stringify(dnsStats, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// ------------------- 全局变量初始化 -------------------
const globalVars = {
  dnsCache: new LRUCache(1000),
  rateLimiter: new RateLimiter(60, 60000),
  dnsStats: {
    cloudflare: { queries: 0, success: 0, failures: 0, totalTime: 0 },
    google: { queries: 0, success: 0, failures: 0, totalTime: 0 },
    opendns: { queries: 0, success: 0, failures: 0, totalTime: 0 }
  }
};
