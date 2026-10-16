// api/register.js — Vercel Serverless Function (DEBUG version)
import { Rcon } from 'rcon-client';

const RATE_LIMIT = new Map();
const RATE_WINDOW = 60 * 1000;
const MAX_REQUESTS = 5;

function checkRateLimit(ip) {
  const now = Date.now();
  const data = RATE_LIMIT.get(ip) || { count: 0, resetAt: now + RATE_WINDOW };
  if (now > data.resetAt) {
    data.count = 0;
    data.resetAt = now + RATE_WINDOW;
  }
  data.count++;
  RATE_LIMIT.set(ip, data);
  return data.count <= MAX_REQUESTS;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ success: false, message: 'Quá nhiều yêu cầu, thử lại sau 1 phút.' });
  }

  const { username, password } = req.body || {};

  // Validate
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Thiếu tên hoặc mật khẩu' });
  }
  if (!/^[A-Za-z0-9_]{3,16}$/.test(username)) {
    return res.status(400).json({ success: false, message: 'Tên 3-16 ký tự, chỉ dùng chữ/số/_' });
  }
  if (password.length < 6 || password.length > 30) {
    return res.status(400).json({ success: false, message: 'Mật khẩu phải từ 6-30 ký tự' });
  }

  let rcon;
  const debug = {
    step: 'init',
    host: process.env.RCON_HOST ? 'SET' : 'MISSING',
    port: process.env.RCON_PORT || 'MISSING',
    passLen: process.env.RCON_PASSWORD ? process.env.RCON_PASSWORD.length : 0,
  };

  try {
    debug.step = 'connect';
    rcon = await Rcon.connect({
      host: process.env.RCON_HOST,
      port: parseInt(process.env.RCON_PORT || '25367'),
      password: process.env.RCON_PASSWORD,
      timeout: 10000
    });

    debug.step = 'test_list';
    const listResult = await rcon.send('list');
    debug.listResult = (listResult || '').substring(0, 200);

    debug.step = 'check_account';
    const checkResult = await rcon.send(`authme accounts ${username}`);
    debug.checkResult = (checkResult || '').substring(0, 200);

    // Nếu tài khoản đã tồn tại
    if (checkResult && checkResult.toLowerCase().includes(username.toLowerCase())
        && !checkResult.toLowerCase().includes('no account')) {
      await rcon.end();
      return res.status(409).json({
        success: false,
        message: 'Tên này đã được đăng ký. Vào game gõ /login <mật_khẩu> để đăng nhập.',
        debug
      });
    }

    debug.step = 'register';
    const regResult = await rcon.send(`authme register ${username} ${password}`);
    debug.regResult = (regResult || '').substring(0, 200);

    await rcon.end();

    // Kiểm tra kết quả register
    const regLower = (regResult || '').toLowerCase();
    if (regLower.includes('error') || regLower.includes('already') || regLower.includes('fail')) {
      return res.status(400).json({
        success: false,
        message: 'Đăng ký thất bại: ' + regResult,
        debug
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Đăng ký thành công! Vào game gõ /login ' + password,
      debug
    });

  } catch (err) {
    if (rcon) try { await rcon.end(); } catch(_) {}
    return res.status(500).json({
      success: false,
      message: 'Lỗi: ' + err.message,
      debug
    });
  }
}
