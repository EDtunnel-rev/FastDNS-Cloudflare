# FastDNS-Cloudflare, An Advanced DNS Resolver Service

## Overview

This repository contains an advanced DNS Resolver service designed to run on Cloudflare Workers. The service is capable of querying DNS records from multiple DNS providers (Cloudflare, Google DNS, OpenDNS), selecting the most reliable result through a consensus mechanism, and caching the results using an LRU cache strategy. Additionally, it includes request rate limiting, detailed logging, and statistics collection, all without the need for persistent storage like KV or Durable Objects.

## Features

### 1. Multi-Provider DNS Resolution
The service queries three major DNS providers:
- **Cloudflare DNS** (1.1.1.1)
- **Google DNS** (8.8.8.8)
- **OpenDNS** (208.67.222.222)

The service returns the fastest result immediately to ensure low latency. It then waits for the remaining two responses, checks for consensus among the results, and re-evaluates if discrepancies are found. The final, most reliable result is then cached and returned to the client.

### 2. LRU (Least Recently Used) Cache
A custom in-memory LRU cache is implemented to store DNS query results. The cache holds up to 1,000 entries by default, ensuring the most frequently accessed data is available without re-querying the DNS providers. The LRU mechanism automatically removes the least accessed entries to make room for new ones.

### 3. Rate Limiting
To prevent abuse, the service includes a rate limiter that restricts each IP address to a maximum of 60 requests per minute. Requests exceeding this limit receive an HTTP 429 status ("Too Many Requests").

### 4. IP Filtering
The service can restrict access based on the client's IP address. By default, it allows only specific IP ranges to interact with the service. This can be easily customized to fit different security requirements.

### 5. Detailed Logging and Statistics
Every request is logged with details including the client's IP address, the queried DNS name, the record type, and the result returned. Additionally, statistics for each DNS provider—such as the number of queries, success rate, failure rate, and average response time—are collected and can be accessed via a special API endpoint.

### 6. Configurable TTL
The Time-To-Live (TTL) for cache entries is configurable, allowing users to control how long DNS results are cached before they expire. The default TTL is set to 3600 seconds (1 hour).

### 7. Error Handling
The service is robust with detailed error handling. If a DNS provider fails to respond or returns an error, the service handles it gracefully by retrying the query up to three times. If inconsistencies persist across different providers, the service defaults to trusting Cloudflare's DNS result.

## Architecture

The DNS resolver service is designed with performance, reliability, and scalability in mind. Here’s a breakdown of the core components:

### LRU Cache
The LRU Cache is implemented as a doubly-linked list combined with a hash map. This design allows for O(1) time complexity for both insertions and lookups. When the cache reaches its maximum size, the least recently accessed entry is removed to make room for new entries.

### Rate Limiter
The Rate Limiter tracks requests by IP address within a sliding time window (60 seconds by default). It ensures that clients adhere to the defined rate limits and prevents abuse by limiting the number of allowed requests per minute.

### DNS Resolution and Consensus Mechanism
The service sends concurrent DNS queries to the three DNS providers. The first response is returned to the user immediately for speed. Then, within a 1-second timeout window, the service evaluates the other responses for consistency. If the responses differ, the service re-queries the DNS providers and looks for a consensus (i.e., at least two out of three providers agreeing). In case of persistent inconsistencies, the service defaults to Cloudflare's result.

### Logging and Statistics
Logs and statistics are stored in memory and can be accessed via a special endpoint. This allows for real-time monitoring of the service’s performance and usage patterns.

## Getting Started

### Prerequisites

Before setting up the DNS resolver, you need:
- A Cloudflare Workers account
- Basic knowledge of JavaScript and HTTP requests

### Setup

1. **Clone the Repository**

   Clone the repository to your local machine using Git:
   ```bash
   git clone https://github.com/yourusername/dns-resolver-worker.git
   cd dns-resolver-worker
   ```

2. **Deploy to Cloudflare Workers**

   You'll need to deploy the service to Cloudflare Workers. This requires setting up a Cloudflare account and configuring the Workers environment.

   ```bash
   wrangler login
   wrangler init
   wrangler publish
   ```

3. **Configure Environment Variables**

   The DNS resolver service doesn’t require persistent storage like KV, but you can configure it through environment variables if needed. Edit the `wrangler.toml` file to set these variables:

   ```toml
   name = "dns-resolver-worker"
   type = "javascript"

   account_id = "your-account-id"
   workers_dev = true
   compatibility_date = "2023-08-01"
   ```

   You can add additional configuration here, such as customizing the TTL, adjusting the cache size, or setting rate limits.

4. **Customizing IP Filtering and Rate Limits**

   To customize the IP filtering or rate limits, you can directly edit the `isAllowedIP` and `RateLimiter` classes in the `index.js` file. Adjust the IP ranges or request limits to fit your security requirements.

### Usage

#### Querying DNS Records

You can query DNS records by making an HTTP GET request to your Cloudflare Worker with the following parameters:

- `name`: The domain name to query.
- `type`: The DNS record type (A, AAAA, CNAME, MX, etc.).
- `format`: The response format (json or text). The default is `json`.
- `ttl`: (Optional) Time-To-Live for the cache entry in seconds.

**Example Request:**
```bash
curl "https://your-worker-url.workers.dev?name=example.com&type=A&format=json"
```

**Example Response:**
```json
{
  "Status": 0,
  "TC": false,
  "RD": true,
  "RA": true,
  "AD": false,
  "CD": false,
  "Question": [
    {
      "name": "example.com.",
      "type": 1
    }
  ],
  "Answer": [
    {
      "name": "example.com.",
      "type": 1,
      "TTL": 3599,
      "data": "93.184.216.34"
    }
  ]
}
```

#### Accessing Statistics

To view real-time DNS query statistics, access the following endpoint:

```bash
curl "https://your-worker-url.workers.dev/stats"
```

This will return a JSON object with statistics for each DNS provider, including the number of queries, success rate, failures, and average response time.

### Modifying the Service

The service is designed to be easily extensible. Below are some common modifications:

#### 1. Adjusting Cache Size

If you need to adjust the cache size beyond the default 1,000 entries, modify the `LRUCache` initialization in `index.js`:

```javascript
const dnsCache = new LRUCache(2000); // Increase cache size to 2000 entries
```

#### 2. Customizing Rate Limits

To change the rate limit settings, modify the `RateLimiter` class initialization:

```javascript
const rateLimiter = new RateLimiter(100, 60000); // Allow 100 requests per minute per IP
```

#### 3. Adding Support for More DNS Providers

You can add support for additional DNS providers by extending the `fetchDNSFromService` function. Simply add the DNS provider's query URL and update the `Promise.allSettled` call to include the new provider.

#### 4. Persistent Storage with KV

If you require persistent storage for cache or logs, you can modify the service to use Cloudflare KV. This would involve changing the cache and logging mechanisms to store and retrieve data from KV, instead of relying solely on in-memory storage.

### Performance Considerations

#### Latency

The DNS resolver service is optimized for low-latency responses by immediately returning the first available result. Further optimizations include the use of an LRU cache to avoid redundant queries and reduce the load on DNS providers.

#### Throughput

Given the rate limiting and caching mechanisms, the service is capable of handling a high volume of requests while preventing abuse and ensuring reliable performance. The in-memory storage ensures fast access, though it is subject to the limitations of the Workers’ execution environment.

#### Fault Tolerance

The service is built with fault tolerance in mind. If one DNS provider fails to respond, the service gracefully handles the error, retries the query, and ultimately returns the most reliable result. By using multiple DNS providers and a consensus mechanism, the service ensures the highest possible accuracy and reliability.

### Security

#### IP Filtering

The service includes IP filtering to restrict access based on predefined IP ranges. This can be modified to include or exclude specific IPs as required. IP filtering is crucial in preventing unauthorized access and ensuring that only trusted clients can use the DNS resolver.

#### Rate Limiting

Rate limiting is another key security feature that prevents abuse by limiting the number of requests that can be made from a single IP address within a certain time frame.

 This helps protect the service from DDoS attacks and ensures fair usage across all clients.

#### HTTPS Enforcement

Since the service is deployed on Cloudflare Workers, all requests are handled over HTTPS by default, ensuring that DNS queries and responses are encrypted during transit. This is critical for maintaining the integrity and confidentiality of DNS queries.

### Troubleshooting

If you encounter issues with the DNS resolver service, consider the following steps:

#### Check Logs

Logs can provide valuable insights into the operation of the service, including any errors that may have occurred. These logs are printed to the console and can be accessed through the Cloudflare Workers dashboard.

#### Review Rate Limits

If requests are being blocked, ensure that the rate limits are set correctly and that your IP address is not exceeding the allowed number of requests per minute.

#### Debugging Cache Issues

If the service is returning stale or unexpected results, consider clearing the cache or adjusting the TTL settings. The cache can be cleared by redeploying the service or modifying the cache size to temporarily invalidate old entries.

#### Monitor DNS Provider Status

If one of the DNS providers is consistently failing, it may be due to issues with the provider itself. Consider temporarily disabling the problematic provider or adjusting the consensus mechanism to favor more reliable providers.

### Future Enhancements

While the service is fully functional as-is, there are several enhancements that could be implemented in the future:

#### 1. Support for Additional DNS Record Types
Expanding the service to support a wider range of DNS record types, such as SRV, TXT, and DNSSEC-related records, would increase its versatility.

#### 2. Integration with Other Cloudflare Services
Integrating with other Cloudflare services, such as Durable Objects or Web Analytics, could provide additional insights and capabilities, such as detailed query logging or persistent storage.

#### 3. Global Load Balancing
Implementing global load balancing across multiple Cloudflare data centers could further improve performance and reliability by routing DNS queries to the nearest or fastest available data center.

### Contributing

Contributions to the DNS resolver service are welcome! Whether you want to report bugs, suggest new features, or submit pull requests, your input is valuable. Please follow the guidelines below to contribute:

1. **Fork the Repository**

   Fork the repository on GitHub and clone it to your local machine.

   ```bash
   git clone https://github.com/yourusername/dns-resolver-worker.git
   ```

2. **Create a Feature Branch**

   Create a new branch for your feature or bugfix.

   ```bash
   git checkout -b feature/new-feature
   ```

3. **Commit Changes**

   Make your changes, then commit them with a clear and concise message.

   ```bash
   git commit -m "Add support for SRV records"
   ```

4. **Submit a Pull Request**

   Push your changes to GitHub and submit a pull request. Include a description of the changes you made and why they are necessary.

### License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

### Acknowledgments

Thanks to the Cloudflare Workers team for providing a powerful platform that enables the creation of serverless applications with ease.
