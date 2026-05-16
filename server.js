const http = require('http');
const https = require('https');

// 👇 只需要把这里的英文引号里，换成你的完整API密钥！！！
const API_KEY = 'sk-7689b637f8164f4b87673685f0aa8177';

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  // 全局跨域，彻底解决报错
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理跨域预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // AI接口核心功能
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      const proxyReq = https.request({
        hostname: 'api.deepseek.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + API_KEY
        }
      }, proxyRes => {
        let data = '';
        proxyRes.on('data', chunk => data += chunk);
        proxyRes.on('end', () => {
          res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(data);
        });
      });

      proxyReq.on('error', err => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '请求失败' }));
      });

      proxyReq.write(body);
      proxyReq.end();
    });
    return;
  }

  // 服务正常运行提示
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Server is running!');
});

server.listen(PORT, () => {
  console.log(`服务启动成功`);
});
