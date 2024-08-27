# OpenDNS-Cloudflare

## 概述

本项目是一个使用 Cloudflare Workers 实现的全功能 DNS 服务器。它支持递归 DNS 解析，并处理多种 DNS 记录类型，包括 A、AAAA、CNAME、DNAME、MX 和 TXT 记录。该服务器通过 HTTPS 上的 DNS（DoH，DNS over HTTPS）进行操作，确保所有 DNS 查询和响应都是加密的，增强了安全性和隐私性。

### 目录

- [概述](#概述)
- [功能](#功能)
- [工作原理](#工作原理)
  - [递归 DNS 解析](#递归-dns-解析)
  - [支持的 DNS 记录类型](#支持的-dns-记录类型)
  - [DNS 查询构建](#dns-查询构建)
  - [DNS 响应解析](#dns-响应解析)
- [安装](#安装)
  - [前提条件](#前提条件)
  - [设置](#设置)
- [使用](#使用)
  - [基本使用](#基本使用)
  - [查询不同的记录类型](#查询不同的记录类型)
- [自定义](#自定义)
  - [增加对更多 DNS 记录类型的支持](#增加对更多-dns-记录类型的支持)
  - [修改递归解析逻辑](#修改递归解析逻辑)
- [限制](#限制)
- [贡献](#贡献)
- [许可证](#许可证)

## 功能

- **完整的 DNS 解析**：服务器执行递归 DNS 解析，从根服务器开始，逐级查询 DNS 层级结构以解析域名。
- **支持多种记录类型**：处理多种 DNS 记录类型，包括 A、AAAA、CNAME、DNAME、MX 和 TXT。
- **DoH 集成**：所有 DNS 查询都通过 HTTPS 使用 DNS over HTTPS（DoH）传输，以确保安全和私密的通信。
- **可定制和可扩展**：代码库设计易于扩展，支持更多的 DNS 记录类型，并可根据具体需求进行定制。
- **轻量快速**：部署在 Cloudflare Workers 上，服务器性能高，延迟低，且具有全球可用性。

## 工作原理

### 递归 DNS 解析

DNS 服务器通过查询一个根 DNS 服务器来开始域名解析过程。如果根服务器不能直接解析域名（通常它不能），它会提供一个更具体的 DNS 服务器的地址，例如负责查询域的顶级域名（TLD）的服务器。

然后，服务器查询 TLD 服务器，TLD 服务器可能会解析查询，或者将服务器指向可以解析的权威 DNS 服务器。这个过程递归进行，直到 DNS 服务器找到请求的记录或确定该域名不存在。

### 支持的 DNS 记录类型

服务器支持以下 DNS 记录类型：

- **A**：将域名映射到 IPv4 地址。
- **AAAA**：将域名映射到 IPv6 地址。
- **CNAME**：将域名映射到另一个域名（规范名称）。
- **DNAME**：将域名映射到域名空间子树的另一个域名。
- **MX**：指定域名的邮件交换服务器。
- **TXT**：保存任意文本数据，通常用于电子邮件验证，如 SPF、DKIM 或 DMARC 记录。

### DNS 查询构建

DNS 查询采用二进制格式构建。服务器创建包含必要头部信息和问题部分的 DNS 查询数据包，问题部分包括查询的域名和请求的记录类型。

查询数据包然后被编码为 Base64URL 格式，通过 HTTPS 请求发送到一个 DoH 服务器（在本例中为 Cloudflare 的 DoH 服务器）。

### DNS 响应解析

服务器接收一个二进制的 DNS 响应，并对其进行解析。响应包含几个部分：问题部分、答案部分、权威部分和附加部分。

- **答案部分**：包含回答问题的资源记录。
- **权威部分**：包含指向权威 DNS 服务器的资源记录。
- **附加部分**：包含与查询相关的附加信息资源记录。

服务器处理这些部分，提取和解释数据，如有必要，使用权威和附加部分的信息进行进一步查询。

## 安装

### 前提条件

在部署此 DNS 服务器之前，请确保您具备以下条件：

1. **Cloudflare 账户**：您需要一个 Cloudflare 账户来部署 Workers。
2. **Wrangler CLI**：Cloudflare 的命令行工具，用于管理 Workers。您可以使用 npm 安装它：
    ```sh
    npm install -g wrangler
    ```

### 设置

1. **克隆仓库**：
    ```sh
    git clone https://github.com/your-username/cloudflare-workers-dns-server.git
    cd cloudflare-workers-dns-server
    ```

2. **配置 Wrangler**：
    运行以下命令，用您的 Cloudflare 账户配置 Wrangler：
    ```sh
    wrangler login
    ```

3. **部署 Worker**：
    使用以下命令部署 DNS 服务器：
    ```sh
    wrangler publish
    ```

    部署后，Wrangler 将提供一个 URL，您的 DNS 服务器将可通过该 URL 访问。

## 使用

### 基本使用

一旦部署，您可以通过向提供的 URL 发出 HTTP 请求来使用 DNS 服务器。服务器期望接收以下查询参数：

- **hostname**：要解析的域名。
- **type**：要查询的 DNS 记录类型（例如 A、AAAA、CNAME）。如果省略，则默认为 `A`。

#### 示例：

要查询 `example.com` 的 A 记录，您可以发出如下请求：

```
https://your-worker.your-domain.com/?hostname=example.com&type=A
```

服务器将返回包含 DNS 记录的 JSON 响应。

### 查询不同的记录类型

您可以通过更改 `type` 参数查询不同的记录类型：

- **AAAA**：获取 `example.com` 的 IPv6 地址：
    ```
    https://your-worker.your-domain.com/?hostname=example.com&type=AAAA
    ```

- **CNAME**：获取 `www.example.com` 的规范名称：
    ```
    https://your-worker.your-domain.com/?hostname=www.example.com&type=CNAME
    ```

- **MX**：获取 `example.com` 的邮件交换服务器：
    ```
    https://your-worker.your-domain.com/?hostname=example.com&type=MX
    ```

- **TXT**：检索 `example.com` 的 TXT 记录：
    ```
    https://your-worker.your-domain.com/?hostname=example.com&type=TXT
    ```

## 自定义

此 DNS 服务器设计为易于定制和扩展。

### 增加对更多 DNS 记录类型的支持

如果您需要增加对更多 DNS 记录类型的支持，可以通过扩展 `dnsTypeToCode` 函数并更新 `parseRecordData` 函数来处理新的记录类型。

#### 示例：

要增加对 `SRV` 记录类型的支持：

1. 在 `dnsTypeToCode` 中添加以下代码：
    ```javascript
    case 'SRV': return 33;
    ```

2. 更新 `parseRecordData` 以处理 `SRV` 记录：
    ```javascript
    case 33: // SRV
        const priority = view.getUint16(offset);
        const weight = view.getUint16(offset + 2);
        const port = view.getUint16(offset + 4);
        const target = parseName(view, offset + 6);
        return { priority, weight, port, target };
    ```

### 修改递归解析逻辑

递归解析逻辑集中在 `resolveDNS` 函数中。如果您需要修改服务器如何处理递归查询，例如添加自定义缓存、在根服务器之间进行负载均衡或不同的查询回退策略，您可以修改此函数。

#### 示例：

要随机化选择根服务器以更好地分配负载：

1. 更新初始根服务器的选择：
    ```javascript
    let server = rootServers[Math.floor(Math.random() * rootServers.length)];
    ```

2. 调整任何依赖于根服务器选择的相关逻辑。

## 限制

虽然此 DNS 服务器功能强大且灵活，但它也有一些限制：

- **延迟**：由于服务器实时执行递归查询，对于具有深度 DNS 层次结构的域名，可能会引入一些延迟。
- **速率限制**：Cloudflare Workers 受速率限制的约束，因此处理大量 DNS 查询可能需要额外的考虑或优化。
- **可扩展性**：虽然 Cloudflare Workers 是全球分布的，但此 DNS 服务器的架构可能需要修改，以有效处理大规模、高性能的场景。

## 贡献

欢迎为本项目做出贡献！无论您有新功能的想法、优化建议或错误修复，请随时提交 pull request 或在 GitHub 上打开一个 issue。

贡献时，请确保您的代码遵循现有的风格和结构。包括详细的提交消息，如果适用，更新文档以反映任何更改。

## 许可证

本项目使用 MIT 许可证。您可以根据许可证的条款

自由使用、修改和分发此软件。有关更多详细信息，请参阅 [LICENSE](LICENSE) 文件。

---

此 README 提供了理解、部署和自定义 Cloudflare Workers DNS 服务器的深入指南。无论您是想按原样使用它，还是扩展其功能以处理更高级的 DNS 任务，本文档都应作为综合资源。
