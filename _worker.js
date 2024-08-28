export default {
  async fetch(req, env, ctx) {
    try {
      let url = new URL(req.url);
      let dnsName = url.searchParams.get('name');
      let dnsType = url.searchParams.get('type') || 'A';

      if (!dnsName) {
        return new Response('Query name is required', { status: 400 });
      }

      // 并行发出DNS请求
      let cloudflareDNS = fetchDNSFromService(dnsName, dnsType, '1.1.1.1');
      let googleDNS = fetchDNSFromService(dnsName, dnsType, '8.8.8.8');
      let openDNS = fetchDNSFromService(dnsName, dnsType, '208.67.222.222');

      // 等待所有请求完成
      let results = await Promise.allSettled([cloudflareDNS, googleDNS, openDNS]);

      // 解析最快的成功请求结果
      let validResults = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      if (validResults.length === 0) {
        return new Response('All DNS services failed', { status: 502 });
      }

      let firstResult = validResults[0];
      let inconsistent = validResults.some(result => JSON.stringify(result) !== JSON.stringify(firstResult));

      // 如果结果不一致，重新请求一次
      if (inconsistent) {
        results = await Promise.allSettled([cloudflareDNS, googleDNS, openDNS]);
        validResults = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        firstResult = validResults[0];
        inconsistent = validResults.some(result => JSON.stringify(result) !== JSON.stringify(firstResult));

        // 仍然不一致，信任Cloudflare
        if (inconsistent) {
          firstResult = (await cloudflareDNS).answer;
        }
      }

      // 返回最终的DNS结果
      return new Response(JSON.stringify(firstResult), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (e) {
      return new Response('DNS query failed', { status: 500 });
    }
  }
};

// DNS 查询函数
async function fetchDNSFromService(name, type, dnsServer) {
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
  return data;
}
