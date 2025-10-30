const { chromium } = require('playwright');

async function debugWebsite(url, siteName) {
    console.log(`\n========== 调试 ${siteName} ==========`);
    console.log(`URL: ${url}\n`);

    const browser = await chromium.launch({
        headless: true, // 无头模式
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ignoreHTTPSErrors: true
    });

    const page = await context.newPage();

    try {
        console.log('正在访问网站...');
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        console.log('等待页面加载...');
        await page.waitForTimeout(3000);

        // 保存页面截图
        await page.screenshot({ path: `debug_${siteName}_initial.png`, fullPage: true });
        console.log(`✓ 截图已保存: debug_${siteName}_initial.png`);

        // 获取页面HTML结构
        const html = await page.content();
        const fs = require('fs').promises;
        await fs.writeFile(`debug_${siteName}_html.html`, html);
        console.log(`✓ HTML已保存: debug_${siteName}_html.html`);

        // 查找搜索输入框
        console.log('\n查找搜索输入框...');
        const inputSelectors = [
            'input[type="search"]',
            'input[placeholder*="搜索"]',
            'input[placeholder*="search"]',
            'input[placeholder*="职位"]',
            'input[placeholder*="关键词"]',
            'input[name*="keyword"]',
            'input.search',
            'input#search',
            'input[type="text"]'
        ];

        for (const selector of inputSelectors) {
            const elements = await page.$$(selector);
            if (elements.length > 0) {
                console.log(`✓ 找到输入框: ${selector} (${elements.length}个)`);
                for (let i = 0; i < elements.length; i++) {
                    const placeholder = await elements[i].getAttribute('placeholder').catch(() => '');
                    const name = await elements[i].getAttribute('name').catch(() => '');
                    const id = await elements[i].getAttribute('id').catch(() => '');
                    console.log(`  [${i}] placeholder="${placeholder}", name="${name}", id="${id}"`);
                }
            }
        }

        // 查找按钮
        console.log('\n查找搜索按钮...');
        const buttonSelectors = [
            'button[type="submit"]',
            'button.search-btn',
            'button[class*="search"]',
            'button[class*="btn"]',
            'button'
        ];

        for (const selector of buttonSelectors) {
            const elements = await page.$$(selector);
            if (elements.length > 0 && elements.length < 20) {
                console.log(`✓ 找到按钮: ${selector} (${elements.length}个)`);
                for (let i = 0; i < Math.min(elements.length, 5); i++) {
                    const text = await elements[i].textContent().catch(() => '');
                    const className = await elements[i].getAttribute('class').catch(() => '');
                    console.log(`  [${i}] text="${text.trim()}", class="${className}"`);
                }
            }
        }

        // 查找职位列表
        console.log('\n查找职位列表元素...');
        const listSelectors = [
            '[class*="job-item"]',
            '[class*="position-item"]',
            '[class*="list-item"]',
            '[class*="job-card"]',
            '[class*="job"]',
            '[data-job]',
            'li[class*="item"]',
            'div[class*="card"]'
        ];

        for (const selector of listSelectors) {
            const elements = await page.$$(selector);
            if (elements.length > 0 && elements.length < 100) {
                console.log(`✓ 找到列表: ${selector} (${elements.length}个)`);
                if (elements.length > 0) {
                    const firstElement = elements[0];
                    const className = await firstElement.getAttribute('class').catch(() => '');
                    const innerHTML = await firstElement.innerHTML().catch(() => '');
                    console.log(`  第一个元素 class="${className}"`);
                    console.log(`  HTML长度: ${innerHTML.length} 字符`);
                }
            }
        }

        console.log('\n\n调试完成！请查看生成的截图和HTML文件');

    } catch (error) {
        console.error('调试过程出错:', error);
    } finally {
        await browser.close();
    }
}

// 运行调试
const args = process.argv.slice(2);
const site = args[0] || 'xiaohongshu';

if (site === 'xiaohongshu') {
    debugWebsite('https://job.xiaohongshu.com/social/position', 'xiaohongshu');
} else if (site === 'bytedance') {
    debugWebsite('https://jobs.bytedance.com/experienced/position', 'bytedance');
} else {
    console.log('用法: node debug.js [xiaohongshu|bytedance]');
}
