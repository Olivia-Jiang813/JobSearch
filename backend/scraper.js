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

        // Launch browser
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });

        const page = await context.newPage();

        // Navigate to the site
        console.log(`访问网站: ${config.url}`);
        await page.goto(config.url, { waitUntil: 'networkidle', timeout: 30000 });

        // Wait for page to load
        await page.waitForTimeout(2000);

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

    } catch (error) {
        console.error('小红书抓取失败:', error);
        throw new Error('无法抓取小红书招聘信息，请检查网站结构是否变化');
    }

    return jobs;
}

// Bytedance specific scraping
async function scrapeBytedance(page, keyword, location, maxResults) {
    const jobs = [];

    try {
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

    } catch (error) {
        console.error('字节跳动抓取失败:', error);
        throw new Error('无法抓取字节跳动招聘信息，请检查网站结构是否变化');
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

module.exports = {
    scrapeJobs
};
