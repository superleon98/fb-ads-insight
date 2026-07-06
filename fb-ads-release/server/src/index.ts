import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import adsRouter from './routes/ads';
import aiRouter from './routes/ai';
import authRouter from './routes/auth';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

app.use(express.json());

const corsOptions: cors.CorsOptions = {
  origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(','),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));

// 请求日志
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// 路由注册
app.use('/api/ads', adsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/auth', authRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: '未找到', message: `接口 ${req.path} 不存在` });
});

// 全局错误
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '请稍后再试',
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================`);
  console.log(`FB 广告洞察后端 v2.0 已启动`);
  console.log(`监听端口: ${PORT}`);
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`AdLibrary API: ${process.env.ADLIBRARY_API_KEY ? '已配置' : '未配置'}`);
  console.log(`Kimi AI: ${process.env.KIMI_API_KEY ? '已配置' : '未配置'}`);
  console.log(`飞书 SSO: ${process.env.FEISHU_APP_ID ? '已配置' : '未配置'}`);
  console.log(`=================================`);
});
