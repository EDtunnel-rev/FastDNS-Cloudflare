addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

const rootServers = [
    { ip: '198.41.0.4', ipv6: '2001:503:ba3e::2:30' },  // A Root
    { ip: '199.9.14.201', ipv6: '2001:500:200::b' },    // B Root
    { ip: '192.33.4.12', ipv6: '2001:500:2::c' },       // C Root
    { ip: '199.7.91.13', ipv6: '2001:500:2d::d' },      // D Root
    { ip: '192.203.230.10', ipv6: '2001:500:a8::e' },   // E Root
    { ip: '192.5.5.241', ipv6: '2001:500:2f::f' },      // F Root
    { ip: '192.112.36.4', ipv6: '2001:500:12::d0d' },   // G Root
    { ip: '198.97.190.53', ipv6: '2001:500:1::53' },    // H Root
    { ip: '192.36.148.17', ipv6: '2001:7fe::53' },      // I Root
    { ip: '192.58.128.30', ipv6: '2001:503:c27::2:30' },// J Root
    { ip: '193.0.14.129', ipv6: '2001:7fd::1' },        // K Root
    { ip: '199.7.83.42', ipv6: '2001:500:9f::42' },     // L Root
    { ip: '202.12.27.33', ipv6: '2001:dc3::35' },       // M Root
];

async function handleRequest(request) {
    const url = new URL(request.url);
    const hostname = url.searchParams.get("hostname");
    const type = url.searchParams.get("type") || 'A'; // Default to A record

    if (!hostname) {
        return new Response("Please provide a 'hostname' parameter.", { status: 400 });
    }

    try {
        const response = await resolveDNS(hostname, type);
        return new Response(JSON.stringify(response, null, 2), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (err) {
        return new Response(`Error resolving DNS: ${err.message}`, { status: 500 });
    }
}

async function resolveDNS(hostname, type) {
    let server = rootServers[0]; // Start with the first root server
    let result = null;
    let queryName = hostname;

    while (true) {
        const dnsQuery = buildDNSQuery(queryName, type);
        const dohResponse = await fetch(`https://cloudflare-dns.com/dns-query?dns=${dnsQuery}`, {
            headers: { 'accept': 'application/dns-message' }
        });

        const dnsMessage = await dohResponse.arrayBuffer();
        const parsedResponse = parseDNSResponse(dnsMessage);

        if (parsedResponse.Answer) {
            result = parsedResponse.Answer;
            break;
        } else if (parsedResponse.Authority && parsedResponse.Additional) {
            // Process NS records to find the next authoritative server
            server = findNextServer(parsedResponse.Authority, parsedResponse.Additional);
            if (!server) throw new Error("Next server not found.");
        } else {
            throw new Error("Could not resolve DNS query.");
        }
    }

    return result;
}

function buildDNSQuery(hostname, type) {
    const queryId = Math.floor(Math.random() * 65536);
    const flags = 0x0100; // Standard query with recursion desired
    const qdCount = 1;
    const anCount = 0;
    const nsCount = 0;
    const arCount = 0;

    let query = new Uint8Array(12 + hostname.length + 5);
    let offset = 0;

    query.set([queryId >> 8, queryId & 0xff, flags >> 8, flags & 0xff, qdCount >> 8, qdCount & 0xff, anCount >> 8, anCount & 0xff, nsCount >> 8, nsCount & 0xff, arCount >> 8, arCount & 0xff], offset);
    offset += 12;

    const labels = hostname.split('.');
    labels.forEach(label => {
        query[offset++] = label.length;
        query.set([...Buffer.from(label)], offset);
        offset += label.length;
    });

    query.set([0x00, dnsTypeToCode(type) >> 8, dnsTypeToCode(type) & 0xff, 0x00, 0x01], offset); // QTYPE=type, QCLASS=IN
    return Buffer.from(query).toString('base64url');
}

function dnsTypeToCode(type) {
    switch (type.toUpperCase()) {
        case 'A': return 1;
        case 'AAAA': return 28;
        case 'CNAME': return 5;
        case 'DNAME': return 39;
        case 'MX': return 15;
        case 'TXT': return 16;
        case 'NS': return 2;
        default: throw new Error("Unsupported DNS type");
    }
}

function parseDNSResponse(buffer) {
    const view = new DataView(buffer);
    const answerCount = view.getUint16(6);
    const authorityCount = view.getUint16(8);
    const additionalCount = view.getUint16(10);

    let offset = 12; // Skip header

    // Skip Question section
    while (view.getUint8(offset) !== 0) offset++;
    offset += 5;

    const response = {
        Answer: [],
        Authority: [],
        Additional: []
    };

    if (answerCount > 0) {
        response.Answer = parseDNSRecords(view, offset, answerCount);
    }

    if (authorityCount > 0) {
        offset += response.Answer.length * 16; // Adjust offset after parsing Answer
        response.Authority = parseDNSRecords(view, offset, authorityCount);
    }

    if (additionalCount > 0) {
        offset += response.Authority.length * 16;
        response.Additional = parseDNSRecords(view, offset, additionalCount);
    }

    return response;
}

function parseDNSRecords(view, offset, count) {
    const records = [];
    for (let i = 0; i < count; i++) {
        let record = {};
        record.name = parseName(view, offset);
        offset += record.name.length + 2;

        record.type = view.getUint16(offset);
        offset += 2;

        record.class = view.getUint16(offset);
        offset += 2;

        record.ttl = view.getUint32(offset);
        offset += 4;

        const rdLength = view.getUint16(offset);
        offset += 2;

        record.data = parseRecordData(view, offset, record.type, rdLength);
        offset += rdLength;

        records.push(record);
    }
    return records;
}

function parseName(view, offset) {
    const name = [];
    while (true) {
        const length = view.getUint8(offset);
        if (length === 0) break;
        if ((length & 0xc0) === 0xc0) { // Pointer
            const pointer = ((length & 0x3f) << 8) | view.getUint8(offset + 1);
            name.push(parseName(view, pointer));
            offset += 2;
            break;
        } else {
            name.push(String.fromCharCode.apply(null, new Uint8Array(view.buffer, offset + 1, length)));
            offset += length + 1;
        }
    }
    return name.join('.');
}

function parseRecordData(view, offset, type, length) {
    switch (type) {
        case 1: // A record
            return `${view.getUint8(offset)}.${view.getUint8(offset + 1)}.${view.getUint8(offset + 2)}.${view.getUint8(offset + 3)}`;
        case 28: // AAAA record
            return Array.from(new Uint8Array(view.buffer, offset, 16)).map(byte => byte.toString(16).padStart(2, '0')).join(':');
        case 5: // CNAME
        case 39: // DNAME
        case 2: // NS
            return parseName(view, offset);
        case 15: // MX
            const preference = view.getUint16(offset);
            const exchange = parseName(view, offset + 2);
            return { preference, exchange };
        case 16: // TXT
            const txtLength = view.getUint8(offset);
            return new TextDecoder().decode(view.buffer.slice(offset + 1, offset + 1 + txtLength));
        default:
            return "Unsupported record type";
    }
}

function findNextServer(authorityRecords, additionalRecords) {
    let nextServer = null;
    for (const record of authorityRecords) {
        if (record.type === 2) { // NS record
            nextServer = additionalRecords.find(addRecord => addRecord.name === record.data && addRecord.type === 1);
            if (nextServer) break;
        }
    }
    return nextServer;
}
