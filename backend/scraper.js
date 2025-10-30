const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Load site configurations
async function loadSiteConfig(siteName) {
    try {
        const configPath = path.join(__dirname, 'config', `${siteName}.json`);
        const configData = await fs.readFile(configPath, 'utf-8');
        return JSON.parse(configData);
    } catch (error) {
        console.error(`无法加载配置文件: ${siteName}`, error);
        return null;
    }
}

// Main scraping function
async function scrapeJobs({ website, customUrl, keyword, location, maxResults }) {
    let browser;
    let config;

    try {
        // Load configuration based on website
        if (website !== 'custom') {
            config = await loadSiteConfig(website);
            if (!config) {
                throw new Error(`不支持的网站: ${website}`);
            }
        } else {
            // For custom URLs, use a generic scraping strategy
            config = {
                name: 'Custom Site',
                url: customUrl,
                strategy: 'generic'
            };
        }

        console.log(`使用配置: ${config.name}`);

        // Launch browser with anti-detection settings
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage'
            ]
        });

        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            ignoreHTTPSErrors: true,
            locale: 'zh-CN',
            timezoneId: 'Asia/Shanghai',
            permissions: ['geolocation'],
            extraHTTPHeaders: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Cache-Control': 'max-age=0'
            }
        });

        const page = await context.newPage();

        // Hide webdriver property
        await page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });

            // Mock chrome object
            window.chrome = {
                runtime: {}
            };

            // Mock plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });

            // Mock languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['zh-CN', 'zh', 'en-US', 'en']
            });
        });

        // Navigate to the site
        console.log(`访问网站: ${config.url}`);
        await page.goto(config.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait for page to load and dynamic content
        await page.waitForTimeout(5000);

        let jobs = [];

        // Use site-specific scraping strategy
        if (config.strategy === 'xiaohongshu') {
            jobs = await scrapeXiaohongshu(page, keyword, location, maxResults);
        } else if (config.strategy === 'bytedance') {
            jobs = await scrapeBytedance(page, keyword, location, maxResults);
        } else {
            jobs = await scrapeGeneric(page, keyword, location, maxResults);
        }

        return jobs;

    } catch (error) {
        console.error('抓取过程出错:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Xiaohongshu specific scraping
async function scrapeXiaohongshu(page, keyword, location, maxResults) {
    const jobs = [];

    try {
        // Check for access denial
        const bodyText = await page.textContent('body');
        if (bodyText.includes('Access denied') || bodyText.includes('访问被拒绝')) {
            console.log('检测到反爬虫机制，使用模拟数据...');
            return getMockJobs('xiaohongshu', keyword, location, maxResults);
        }

        // Wait for search input
        await page.waitForSelector('input[placeholder*="搜索"], input[type="text"]', { timeout: 10000 });

        // Find and fill search input
        const searchInput = await page.$('input[placeholder*="搜索"], input[type="text"]');
        if (searchInput) {
            await searchInput.fill(keyword);
            await page.waitForTimeout(1000);

            // Try to submit search (press Enter or click search button)
            await searchInput.press('Enter');
            await page.waitForTimeout(3000);
        }

        // Wait for job listings to load
        await page.waitForSelector('[class*="job"], [class*="position"], [class*="item"]', { timeout: 10000 });

        // Extract job information
        const jobElements = await page.$$('[class*="job-item"], [class*="position-item"], [class*="list-item"]');

        for (let i = 0; i < Math.min(jobElements.length, maxResults); i++) {
            try {
                const element = jobElements[i];

                const title = await element.$eval('[class*="title"], [class*="name"], h3, h4',
                    el => el.textContent.trim()).catch(() => '');

                const company = await element.$eval('[class*="company"], [class*="corp"]',
                    el => el.textContent.trim()).catch(() => '');

                const jobLocation = await element.$eval('[class*="location"], [class*="city"], [class*="area"]',
                    el => el.textContent.trim()).catch(() => '');

                const salary = await element.$eval('[class*="salary"], [class*="pay"]',
                    el => el.textContent.trim()).catch(() => '');

                const link = await element.$eval('a',
                    el => el.href).catch(() => '');

                if (title) {
                    jobs.push({
                        title,
                        company,
                        location: jobLocation || location,
                        salary,
                        link,
                        source: '小红书招聘'
                    });
                }
            } catch (err) {
                console.error('提取岗位信息失败:', err);
            }
        }

        if (jobs.length === 0) {
            console.log('未找到真实数据，使用模拟数据...');
            return getMockJobs('xiaohongshu', keyword, location, maxResults);
        }

    } catch (error) {
        console.error('小红书抓取失败:', error);
        console.log('返回模拟数据供演示...');
        return getMockJobs('xiaohongshu', keyword, location, maxResults);
    }

    return jobs;
}

// Bytedance specific scraping
async function scrapeBytedance(page, keyword, location, maxResults) {
    const jobs = [];

    try {
        // Check for access denial
        const bodyText = await page.textContent('body');
        if (bodyText.includes('Access denied') || bodyText.includes('访问被拒绝')) {
            console.log('检测到反爬虫机制，使用模拟数据...');
            return getMockJobs('bytedance', keyword, location, maxResults);
        }

        // Wait for search functionality
        await page.waitForSelector('input[placeholder*="搜索"], input[type="text"]', { timeout: 10000 });

        // Fill search keyword
        const searchInput = await page.$('input[placeholder*="搜索"], input[type="text"]');
        if (searchInput) {
            await searchInput.fill(keyword);
            await page.waitForTimeout(1000);
            await searchInput.press('Enter');
            await page.waitForTimeout(3000);
        }

        // Wait for job list
        await page.waitForSelector('[class*="job"], [class*="position"]', { timeout: 10000 });

        // Extract job information
        const jobElements = await page.$$('[class*="job-card"], [class*="position-item"], [class*="job-item"]');

        for (let i = 0; i < Math.min(jobElements.length, maxResults); i++) {
            try {
                const element = jobElements[i];

                const title = await element.$eval('[class*="title"], [class*="name"]',
                    el => el.textContent.trim()).catch(() => '');

                const company = await element.$eval('[class*="company"]',
                    el => el.textContent.trim()).catch(() => '字节跳动');

                const jobLocation = await element.$eval('[class*="location"], [class*="city"]',
                    el => el.textContent.trim()).catch(() => '');

                const salary = await element.$eval('[class*="salary"]',
                    el => el.textContent.trim()).catch(() => '');

                const experience = await element.$eval('[class*="experience"], [class*="requirement"]',
                    el => el.textContent.trim()).catch(() => '');

                const link = await element.$eval('a',
                    el => el.href).catch(() => '');

                if (title) {
                    jobs.push({
                        title,
                        company,
                        location: jobLocation || location,
                        salary,
                        experience,
                        link,
                        source: '字节跳动招聘'
                    });
                }
            } catch (err) {
                console.error('提取岗位信息失败:', err);
            }
        }

        if (jobs.length === 0) {
            console.log('未找到真实数据，使用模拟数据...');
            return getMockJobs('bytedance', keyword, location, maxResults);
        }

    } catch (error) {
        console.error('字节跳动抓取失败:', error);
        console.log('返回模拟数据供演示...');
        return getMockJobs('bytedance', keyword, location, maxResults);
    }

    return jobs;
}

// Generic scraping for custom URLs
async function scrapeGeneric(page, keyword, location, maxResults) {
    const jobs = [];

    try {
        // Try to find search input
        const searchSelectors = [
            'input[type="search"]',
            'input[placeholder*="搜索"]',
            'input[placeholder*="search"]',
            'input[name*="keyword"]',
            'input[name*="search"]',
            'input.search',
            'input#search'
        ];

        let searchInput = null;
        for (const selector of searchSelectors) {
            searchInput = await page.$(selector);
            if (searchInput) break;
        }

        if (searchInput) {
            await searchInput.fill(keyword);
            await page.waitForTimeout(1000);
            await searchInput.press('Enter');
            await page.waitForTimeout(3000);
        }

        // Try to find job listings with common patterns
        const listSelectors = [
            '[class*="job-item"]',
            '[class*="position-item"]',
            '[class*="list-item"]',
            '[class*="card"]',
            'li[class*="job"]',
            'div[class*="job"]'
        ];

        let jobElements = [];
        for (const selector of listSelectors) {
            jobElements = await page.$$(selector);
            if (jobElements.length > 0) break;
        }

        // Extract information from found elements
        for (let i = 0; i < Math.min(jobElements.length, maxResults); i++) {
            try {
                const element = jobElements[i];
                const text = await element.textContent();

                // Try to extract link
                const link = await element.$eval('a', el => el.href).catch(() => '');

                if (text && text.trim()) {
                    jobs.push({
                        title: text.split('\n')[0].trim(),
                        description: text.trim(),
                        link,
                        source: 'Custom Site'
                    });
                }
            } catch (err) {
                console.error('提取信息失败:', err);
            }
        }

        if (jobs.length === 0) {
            throw new Error('未能找到岗位信息，该网站可能需要自定义配置');
        }

    } catch (error) {
        console.error('通用抓取失败:', error);
        throw error;
    }

    return jobs;
}

// Generate mock jobs data for demonstration
function getMockJobs(source, keyword, location, maxResults) {
    const mockJobTemplates = {
        xiaohongshu: [
            {
                titles: ['AI产品经理', 'AI算法工程师', 'AI产品专家', '机器学习工程师', '自然语言处理工程师'],
                companies: ['小红书', '小红书-商业化团队', '小红书-算法团队', '小红书-产品团队'],
                locations: ['上海', '北京', '深圳', '杭州'],
                salaries: ['30-50K·14薪', '40-70K·14薪', '25-45K·14薪', '35-60K·14薪'],
                experiences: ['3-5年', '5-10年', '1-3年', '3年以上'],
                educations: ['本科', '硕士', '本科及以上'],
                descriptions: [
                    '负责AI产品的规划和设计，推动AI技术在产品中的应用',
                    '参与推荐算法、NLP等AI技术的研发和优化',
                    '设计并优化AI产品功能，提升用户体验',
                    '研究前沿AI技术，落地到实际产品场景中'
                ]
            }
        ],
        bytedance: [
            {
                titles: ['AI产品经理', 'AI工程师', '机器学习研究员', 'AI产品运营', '推荐算法工程师'],
                companies: ['字节跳动', '字节跳动-抖音', '字节跳动-今日头条', '字节跳动-飞书'],
                locations: ['北京', '上海', '深圳', '杭州', '广州'],
                salaries: ['35-60K·15薪', '45-80K·15薪', '30-55K·15薪', '40-70K·15薪'],
                experiences: ['3-5年', '5-10年', '1-3年', '应届生'],
                educations: ['本科', '硕士', '博士', '硕士及以上'],
                descriptions: [
                    '负责AI相关产品的需求分析和功能设计',
                    '开发和优化推荐系统、搜索算法等AI核心技术',
                    '参与AI产品的数据分析和效果评估',
                    '推动AI技术在各业务线的应用和落地'
                ]
            }
        ]
    };

    const template = mockJobTemplates[source] || mockJobTemplates.xiaohongshu;
    const jobs = [];
    const count = Math.min(maxResults, 15);

    for (let i = 0; i < count; i++) {
        const data = template[0];
        jobs.push({
            title: data.titles[i % data.titles.length] + (keyword ? ` (${keyword})` : ''),
            company: data.companies[i % data.companies.length],
            location: location || data.locations[i % data.locations.length],
            salary: data.salaries[i % data.salaries.length],
            experience: data.experiences[i % data.experiences.length],
            education: data.educations[i % data.educations.length],
            description: data.descriptions[i % data.descriptions.length],
            link: source === 'xiaohongshu'
                ? `https://job.xiaohongshu.com/social/position/${1000 + i}`
                : `https://jobs.bytedance.com/experienced/position/${2000 + i}`,
            source: source === 'xiaohongshu' ? '小红书招聘 (演示数据)' : '字节跳动招聘 (演示数据)',
            _isMock: true
        });
    }

    return jobs;
}

module.exports = {
    scrapeJobs
};
