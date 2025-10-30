# 求职信息爬虫

一个支持多个招聘网站的自动化求职信息爬虫系统，支持自定义配置不同网站的抓取规则。

## 功能特点

- 支持多个主流招聘网站（小红书招聘、字节跳动招聘）
- 支持自定义URL和通用爬虫策略
- 可配置的选择器系统，适应不同网站结构
- 基于Playwright的浏览器自动化，支持动态渲染页面
- 简洁友好的Web界面
- 实时搜索和结果展示

## 技术栈

- **前端**: HTML5 + CSS3 + Vanilla JavaScript
- **后端**: Node.js + Express
- **爬虫引擎**: Playwright (Chromium)
- **架构**: RESTful API

## 项目结构

```
JobSearch/
├── frontend/           # 前端文件
│   ├── index.html     # 主页面
│   ├── style.css      # 样式文件
│   └── app.js         # 前端逻辑
├── backend/           # 后端文件
│   ├── server.js      # Express服务器
│   ├── scraper.js     # 爬虫核心逻辑
│   └── config/        # 网站配置
│       ├── xiaohongshu.json    # 小红书配置
│       └── bytedance.json      # 字节跳动配置
├── package.json       # 项目依赖
└── README.md         # 说明文档
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

第一次运行时，Playwright会自动下载Chromium浏览器（约150MB）。

### 2. 启动服务器

```bash
npm start
```

或使用开发模式（自动重启）：

```bash
npm run dev
```

### 3. 访问应用

打开浏览器访问：http://localhost:3000

## 使用方法

1. **选择招聘网站**
   - 从下拉菜单选择预配置的网站（小红书、字节跳动）
   - 或选择"自定义URL"输入任意招聘网站地址

2. **输入搜索信息**
   - 搜索关键词：职位名称（如：前端工程师、产品经理）
   - 工作地点：可选，指定期望工作城市
   - 最大结果数：控制返回的岗位数量（1-100）

3. **开始搜索**
   - 点击"开始搜索"按钮
   - 等待爬虫自动访问网站并抓取数据
   - 查看结果列表

## 添加新网站配置

要支持新的招聘网站，创建一个JSON配置文件：

### 配置文件示例

在 `backend/config/` 目录下创建新的JSON文件（如 `example.json`）：

```json
{
  "name": "示例招聘网站",
  "url": "https://example.com/jobs",
  "strategy": "example",
  "description": "示例网站描述",
  "selectors": {
    "searchInput": "input[placeholder*='搜索']",
    "searchButton": "button.search-btn",
    "jobList": ".job-item",
    "jobTitle": ".job-title",
    "company": ".company-name",
    "location": ".job-location",
    "salary": ".job-salary"
  },
  "waitTime": {
    "initial": 2000,
    "afterSearch": 3000
  }
}
```

### 在scraper.js中添加策略

在 `backend/scraper.js` 中添加对应的爬虫策略函数：

```javascript
async function scrapeExample(page, keyword, location, maxResults) {
    const jobs = [];

    // 实现具体的爬虫逻辑
    // 1. 找到搜索框并输入关键词
    // 2. 提交搜索
    // 3. 等待结果加载
    // 4. 提取岗位信息

    return jobs;
}
```

### 更新前端选择器

在 `frontend/index.html` 中添加新选项：

```html
<option value="example">示例招聘网站</option>
```

## API接口

### POST /api/scrape

抓取岗位信息

**请求体:**
```json
{
  "website": "xiaohongshu",
  "keyword": "前端工程师",
  "location": "北京",
  "maxResults": 20
}
```

**响应:**
```json
{
  "success": true,
  "jobs": [
    {
      "title": "前端开发工程师",
      "company": "某科技公司",
      "location": "北京",
      "salary": "20-40K",
      "experience": "3-5年",
      "link": "https://...",
      "source": "小红书招聘"
    }
  ],
  "count": 20
}
```

## 注意事项

1. **反爬虫机制**
   - 某些网站可能有反爬虫机制
   - 建议合理设置请求频率
   - 遵守网站robots.txt规则

2. **网站结构变化**
   - 招聘网站可能会更新页面结构
   - 如果抓取失败，需要更新对应的配置文件
   - 检查选择器是否仍然有效

3. **性能优化**
   - 首次运行会较慢（浏览器启动）
   - 可以调整headless模式和超时时间
   - 考虑添加缓存机制

4. **法律合规**
   - 仅用于个人学习和求职
   - 不要用于商业用途
   - 尊重网站版权和数据隐私

## 故障排除

### 问题：npm install 失败
- 检查Node.js版本（建议v16+）
- 尝试清除缓存：`npm cache clean --force`
- 使用国内镜像：`npm install --registry=https://registry.npmmirror.com`

### 问题：Playwright下载浏览器失败
- 手动安装：`npx playwright install chromium`
- 或使用代理：`PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright npx playwright install`

### 问题：抓取失败或没有结果
- 检查网站是否可访问
- 查看控制台错误日志
- 尝试在非headless模式下运行（修改scraper.js中的headless: false）
- 更新对应网站的配置文件

## 后续优化

- [ ] 添加数据导出功能（CSV, Excel）
- [ ] 支持更多招聘网站
- [ ] 添加岗位筛选和排序
- [ ] 实现定期自动抓取
- [ ] 添加岗位去重功能
- [ ] 支持多关键词批量搜索
- [ ] 添加数据持久化（数据库）

## 许可证

ISC License

## 贡献

欢迎提交Issue和Pull Request！
