# OpenDNS-Cloudflare

## Overview

This project is a fully functional DNS server implemented using Cloudflare Workers. It supports recursive DNS resolution and handles various DNS record types, including A, AAAA, CNAME, DNAME, MX, and TXT records. The server operates over DNS over HTTPS (DoH), ensuring that all DNS queries and responses are encrypted, enhancing both security and privacy.

### Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
  - [Recursive DNS Resolution](#recursive-dns-resolution)
  - [Supported DNS Record Types](#supported-dns-record-types)
  - [DNS Query Construction](#dns-query-construction)
  - [DNS Response Parsing](#dns-response-parsing)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
- [Usage](#usage)
  - [Basic Usage](#basic-usage)
  - [Querying Different Record Types](#querying-different-record-types)
- [Customization](#customization)
  - [Adding Support for More DNS Record Types](#adding-support-for-more-dns-record-types)
  - [Modifying the Recursive Resolution Logic](#modifying-the-recursive-resolution-logic)
- [Limitations](#limitations)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Full DNS Resolution**: The server performs recursive DNS resolution, starting from the root servers and progressing through the DNS hierarchy to resolve domain names.
- **Support for Multiple Record Types**: Handles various DNS record types, including A, AAAA, CNAME, DNAME, MX, and TXT.
- **DoH Integration**: All DNS queries are transmitted over HTTPS using DNS over HTTPS (DoH) for secure and private communication.
- **Customizable and Extensible**: The codebase is designed to be easily extended to support additional DNS record types and customized to fit specific needs.
- **Lightweight and Fast**: Deployed on Cloudflare Workers, the server is highly performant, with low latency and global availability.

## How It Works

### Recursive DNS Resolution

The DNS server starts by querying one of the root DNS servers to resolve a domain name. If the root server cannot directly resolve the domain (which it typically cannot), it provides the address of a more specific DNS server, such as the one responsible for the top-level domain (TLD) of the queried domain.

The server then queries the TLD server, which may either resolve the query or refer the server to an authoritative DNS server that can. This process continues recursively until the DNS server either finds the requested record or concludes that the domain name does not exist.

### Supported DNS Record Types

The server supports the following DNS record types:

- **A**: Maps a domain name to an IPv4 address.
- **AAAA**: Maps a domain name to an IPv6 address.
- **CNAME**: Maps a domain name to another domain name (canonical name).
- **DNAME**: Maps a domain name to another domain name for a subtree of the domain name space.
- **MX**: Specifies the mail exchange servers for a domain.
- **TXT**: Holds arbitrary text data, often used for email validation, such as SPF, DKIM, or DMARC records.

### DNS Query Construction

DNS queries are constructed using a binary format. The server creates a DNS query packet containing the necessary headers and the question section, which includes the domain name being queried and the record type requested.

The query packet is then encoded in Base64URL format and sent to a DoH server (in this case, Cloudflare's DoH server) via an HTTPS request.

### DNS Response Parsing

The server receives a binary DNS response, which it then parses. The response contains several sections: the question section, the answer section, the authority section, and the additional section.

- **Answer Section**: Contains the resource records answering the question.
- **Authority Section**: Contains resource records pointing to authoritative DNS servers.
- **Additional Section**: Contains resource records with additional information related to the query.

The server processes these sections, extracting and interpreting the data, and if necessary, uses the information from the authority and additional sections to perform further queries.

## Installation

### Prerequisites

Before you can deploy this DNS server, ensure you have the following:

1. **Cloudflare Account**: You need a Cloudflare account to deploy Workers.
2. **Wrangler CLI**: Cloudflare's command-line tool for managing Workers. You can install it using npm:
    ```sh
    npm install -g wrangler
    ```

### Setup

1. **Clone the Repository**:
    ```sh
    git clone https://github.com/your-username/cloudflare-workers-dns-server.git
    cd cloudflare-workers-dns-server
    ```

2. **Configure Wrangler**:
    Run the following command to configure Wrangler with your Cloudflare account:
    ```sh
    wrangler login
    ```

3. **Deploy the Worker**:
    Deploy the DNS server using the following command:
    ```sh
    wrangler publish
    ```

    After deploying, Wrangler will provide a URL where your DNS server is accessible.

## Usage

### Basic Usage

Once deployed, you can use the DNS server by making HTTP requests to the provided URL. The server expects the following query parameters:

- **hostname**: The domain name to resolve.
- **type**: The DNS record type to query (e.g., A, AAAA, CNAME). If omitted, it defaults to `A`.

#### Example:

To query the A record for `example.com`, you would make a request like this:

```
https://your-worker.your-domain.com/?hostname=example.com&type=A
```

The server will return a JSON response with the DNS records.

### Querying Different Record Types

You can query different record types by changing the `type` parameter:

- **AAAA**: To get the IPv6 address for `example.com`:
    ```
    https://your-worker.your-domain.com/?hostname=example.com&type=AAAA
    ```

- **CNAME**: To get the canonical name for `www.example.com`:
    ```
    https://your-worker.your-domain.com/?hostname=www.example.com&type=CNAME
    ```

- **MX**: To get the mail exchange servers for `example.com`:
    ```
    https://your-worker.your-domain.com/?hostname=example.com&type=MX
    ```

- **TXT**: To retrieve the TXT records for `example.com`:
    ```
    https://your-worker.your-domain.com/?hostname=example.com&type=TXT
    ```

## Customization

This DNS server is designed to be easily customizable and extensible.

### Adding Support for More DNS Record Types

If you need to add support for additional DNS record types, you can do so by extending the `dnsTypeToCode` function and updating the `parseRecordData` function to handle the new record types.

#### Example:

To add support for the `SRV` record type:

1. Add the following case to `dnsTypeToCode`:
    ```javascript
    case 'SRV': return 33;
    ```

2. Update `parseRecordData` to handle `SRV` records:
    ```javascript
    case 33: // SRV
        const priority = view.getUint16(offset);
        const weight = view.getUint16(offset + 2);
        const port = view.getUint16(offset + 4);
        const target = parseName(view, offset + 6);
        return { priority, weight, port, target };
    ```

### Modifying the Recursive Resolution Logic

The recursive resolution logic is centralized in the `resolveDNS` function. If you need to modify how the server handles recursive queries, such as adding custom caching, load balancing across root servers, or different query fallback strategies, you can modify this function.

#### Example:

To randomize the selection of root servers for better load distribution:

1. Update the selection of the initial root server:
    ```javascript
    let server = rootServers[Math.floor(Math.random() * rootServers.length)];
    ```

2. Adjust any related logic that depends on the root server selection.

## Limitations

While this DNS server is powerful and flexible, it does have some limitations:

- **Latency**: Since the server performs recursive queries in real-time, it might introduce some latency, especially for domains with deep DNS hierarchies.
- **Rate Limiting**: Cloudflare Workers are subject to rate limits, so handling a large volume of DNS queries might require additional consideration or optimizations.
- **Scalability**: Although Cloudflare Workers are distributed globally, the architecture of this DNS server might need modifications to handle large-scale, high-performance scenarios effectively.

## Contributing

Contributions to this project are welcome! Whether you have ideas for new features, optimizations, or bug fixes, please feel free to submit a pull request or open an issue on GitHub.

When contributing, please ensure your code adheres to the existing style and structure. Include detailed commit messages and, if applicable, update the documentation to reflect any changes.

## License

This project is licensed under the MIT License. You are free to use, modify, and distribute this software under the terms of the license. See the [LICENSE](LICENSE) file for more details.
