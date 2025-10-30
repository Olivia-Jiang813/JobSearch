const API_URL = 'http://localhost:3000';

// DOM elements
const websiteSelect = document.getElementById('website');
const customUrlGroup = document.getElementById('customUrlGroup');
const customUrlInput = document.getElementById('customUrl');
const keywordInput = document.getElementById('keyword');
const locationInput = document.getElementById('location');
const maxResultsInput = document.getElementById('maxResults');
const searchBtn = document.getElementById('searchBtn');
const loadingDiv = document.getElementById('loading');
const resultsDiv = document.getElementById('results');

// Show/hide custom URL input
websiteSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
        customUrlGroup.style.display = 'block';
    } else {
        customUrlGroup.style.display = 'none';
    }
});

// Search button handler
searchBtn.addEventListener('click', async () => {
    const website = websiteSelect.value;
    const keyword = keywordInput.value.trim();
    const location = locationInput.value.trim();
    const maxResults = parseInt(maxResultsInput.value) || 20;

    if (!website) {
        alert('请选择一个招聘网站');
        return;
    }

    if (!keyword) {
        alert('请输入搜索关键词');
        return;
    }

    if (website === 'custom' && !customUrlInput.value.trim()) {
        alert('请输入自定义URL');
        return;
    }

    // Start search
    searchBtn.disabled = true;
    loadingDiv.style.display = 'block';
    resultsDiv.innerHTML = '';

    try {
        const response = await fetch(`${API_URL}/api/scrape`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                website: website === 'custom' ? 'custom' : website,
                customUrl: website === 'custom' ? customUrlInput.value.trim() : undefined,
                keyword,
                location,
                maxResults
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '抓取失败');
        }

        displayResults(data);
    } catch (error) {
        console.error('Error:', error);
        resultsDiv.innerHTML = `
            <div class="error-message">
                <h3>抓取失败</h3>
                <p>${error.message}</p>
            </div>
        `;
    } finally {
        searchBtn.disabled = false;
        loadingDiv.style.display = 'none';
    }
});

function displayResults(data) {
    if (!data.jobs || data.jobs.length === 0) {
        resultsDiv.innerHTML = `
            <div class="no-results">
                <h3>未找到相关岗位</h3>
                <p>请尝试其他关键词或网站</p>
            </div>
        `;
        return;
    }

    let html = `
        <div class="result-header">
            <h2>搜索结果</h2>
            <p class="result-count">找到 ${data.jobs.length} 个岗位</p>
        </div>
    `;

    data.jobs.forEach((job, index) => {
        html += `
            <div class="job-card">
                <div class="job-title">${escapeHtml(job.title || '未知职位')}</div>
                ${job.company ? `<div class="job-company">${escapeHtml(job.company)}</div>` : ''}
                <div class="job-info">
                    ${job.location ? `<span class="job-info-item">${escapeHtml(job.location)}</span>` : ''}
                    ${job.salary ? `<span class="job-info-item">${escapeHtml(job.salary)}</span>` : ''}
                    ${job.experience ? `<span class="job-info-item">${escapeHtml(job.experience)}</span>` : ''}
                    ${job.education ? `<span class="job-info-item">${escapeHtml(job.education)}</span>` : ''}
                </div>
                ${job.description ? `<div class="job-description">${escapeHtml(job.description)}</div>` : ''}
                ${job.link ? `<a href="${escapeHtml(job.link)}" target="_blank" class="job-link">查看详情</a>` : ''}
            </div>
        `;
    });

    resultsDiv.innerHTML = html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
