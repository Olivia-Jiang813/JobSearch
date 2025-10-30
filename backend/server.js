const express = require('express');
const cors = require('cors');
const path = require('path');
const { scrapeJobs } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// API Routes
app.post('/api/scrape', async (req, res) => {
    try {
        const { website, customUrl, keyword, location, maxResults } = req.body;

        if (!website || !keyword) {
            return res.status(400).json({
                error: '缺少必要参数：website 和 keyword'
            });
        }

        console.log(`开始抓取: ${website}, 关键词: ${keyword}, 地点: ${location || '不限'}`);

        const jobs = await scrapeJobs({
            website,
            customUrl,
            keyword,
            location,
            maxResults: maxResults || 20
        });

        console.log(`抓取完成，找到 ${jobs.length} 个岗位`);

        res.json({
            success: true,
            jobs,
            count: jobs.length
        });
    } catch (error) {
        console.error('抓取错误:', error);
        res.status(500).json({
            error: error.message || '抓取失败，请稍后重试'
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '服务运行正常' });
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`API 端点: http://localhost:${PORT}/api/scrape`);
});
