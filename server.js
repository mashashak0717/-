const http = require('http');
const https = require('https');

// 监听Railway的端口（默认3000）
const PORT = process.env.PORT || 3000;
// 替换成你自己的DeepSeek密钥
const API_KEY = 'sk-你的DeepSeek密钥';

const server = http.createServer((req, res) => {
  // 全局开启跨域（允许所有域名访问）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理OPTIONS预检请求（解决跨域）
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 只处理/api/chat的POST请求（你的AI接口）
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      // 代理请求到DeepSeek API
      const proxyReq = https.request({
        hostname: 'api.deepseek.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + sk-7689b637f8164f4b87673685f0aa8177
        }
      }, proxyRes => {
        let data = '';
        proxyRes.on('data', chunk => data += chunk);
        proxyRes.on('end', () => {
          res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
          res.end(data);
        });
      });

      // 错误处理
      proxyReq.on('error', err => {
        console.error(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'API请求失败' }));
      });

      // 发送请求体
      proxyReq.write(body);
      proxyReq.end();
    });
    return;
  }

  // 其他请求返回OK（用于验证服务是否正常）
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Server is running!');
});

// 启动服务
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
