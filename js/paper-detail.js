const supabaseUrl_d = "https://grgpsujmjbeuphwvxhpg.supabase.co";
const supabaseServiceKey_d = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3BzdWptamJldXBod3Z4aHBnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTIzNzExNCwiZXhwIjoyMDc0ODEzMTE0fQ.hy4_n74vuailNkPHWkt9YWINfQFsNuwLHNcg7knUlL4";
const supabaseAdmin_d = supabase.createClient(supabaseUrl_d, supabaseServiceKey_d);

// 获取URL中的论文ID
function getPaperIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const paperId = urlParams.get('id');
    
    if (paperId) {
        console.log("从URL参数获取到paperId: ", paperId);
        return paperId;
    }
    
    console.log("未找到paperId参数");
    return null;
}

// 获取单篇论文详情
async function getPaperDetail(paperId) {
    if (!supabaseAdmin_d) {
        throw new Error('Supabase客户端未初始化');
    }
    
    try {
        const { data, error } = await supabaseAdmin_d
            .from('research_papers')
            .select(`
                *,
                user_profiles (
                    display_name,
                    oc_name,
                    avatar_url
                )
            `)
            .eq('id', paperId)
//            .eq('status', 'published')
            .single();
            
        if (error) throw error;
        return data;
        
    } catch (error) {
        console.error('获取论文详情失败:', error);
        throw error;
    }
}

// 渲染论文详情
function renderPaperDetail(paper) {
    const container = document.getElementById('paper-detail-container');
    
    if (!paper) {
        container.innerHTML = `
            <div class="nbu-error-state">
                <div class="nbu-error-icon">❌</div>
                <h3>论文不存在</h3>
                <p>您访问的论文可能已被删除或尚未发布</p>
                <a href="/research/papers/" class="nbu-submit-btn">返回论文库</a>
            </div>
        `;
        return;
    }
    
    const authorName = paper.user_profiles?.oc_name || 
                      paper.user_profiles?.display_name || 
                      '匿名研究者';
    
    container.innerHTML = `
        <article class="nbu-paper-detail">
            <header class="nbu-paper-header">
                <nav class="nbu-breadcrumb">
                    <a href="/research/papers/">← 返回论文库</a>
                </nav>
                
                <h1 class="nbu-paper-title">${paper.title}</h1>
                
                <div class="nbu-paper-meta">
                    <div class="nbu-paper-author">
                        <img src="${paper.user_profiles?.avatar_url || '/images/default-avatar.png'}" 
                             alt="${authorName}" class="nbu-author-avatar">
                        <span>作者: ${authorName}</span>
                    </div>
                    
                    <div class="nbu-paper-info">
                        <span class="nbu-paper-date">
                            📅 发表时间: ${new Date(paper.created_at).toLocaleDateString('zh-CN')}
                        </span>
                        ${paper.topics && paper.topics.length > 0 ? `
                            <span class="nbu-paper-topics">
                                🏷️ 研究领域: ${paper.topics.join('、')}
                            </span>
                        ` : ''}
                    </div>
                </div>
            </header>
            
            <section class="nbu-paper-abstract-section">
                <h2>📖 摘要</h2>
                <div class="nbu-abstract-content">${paper.abstract}</div>
            </section>
            
            <section class="nbu-paper-content-section">
                <h2>📄 正文</h2>
                <div class="nbu-paper-content" id="paper-content">
                    <!-- Markdown内容将通过JavaScript渲染 -->
                </div>
            </section>
            
            <footer class="nbu-paper-footer">
                <a href="/research/papers/" class="nbu-back-btn">返回论文库</a>
                <a href="/research/submit/" class="nbu-submit-btn">提交新论文</a>
            </footer>
        </article>
    `;
    
    // 渲染Markdown内容
    renderMarkdownContent(paper.content);
}

// 渲染Markdown内容（完整版本）
function renderMarkdownContent(markdownText) {
    const contentElement = document.getElementById('paper-content');
    if (!contentElement) return;
    
    // 完整的Markdown解析
    let html = markdownText
        // 标题
        .replace(/^##### (.*$)/gim, '<h5>$1</h5>')
        .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // 粗体
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        // 斜体
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        // 删除线
        .replace(/~~(.*?)~~/gim, '<del>$1</del>')
        // 图片 - 这是关键修复！
        .replace(/!\[(.*?)\]\((.*?)\)/gim, '<div class="nbu-paper-image"><img src="$2" alt="$1" loading="lazy"><div class="nbu-image-caption">$1</div></div>')
        // 链接
        .replace(/\[([^\[]+)\]\(([^\)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener">$1</a>')
        // 行内代码
        .replace(/`(.*?)`/g, '<code>$1</code>')
        // 代码块
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
        // 引用
        .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
        // 水平线
        .replace(/^\-\-\-$/gim, '<hr>')
        // 无序列表
        .replace(/^\s*[\-\*\+] (.*$)/gim, '<ul><li>$1</li></ul>')
        // 有序列表
        .replace(/^\s*\d+\. (.*$)/gim, '<ol><li>$1</li></ol>')
        // 段落和换行
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    // 确保有段落包裹
    if (!html.startsWith('<')) {
        html = '<p>' + html + '</p>';
    }
    
    contentElement.innerHTML = html;
    
    // 处理图片加载错误
    handleImageErrors();
}

// 处理图片加载错误
function handleImageErrors() {
    const images = document.querySelectorAll('.nbu-paper-image img');
    images.forEach(img => {
        img.onerror = function() {
            this.style.display = 'none';
            const caption = this.parentElement.querySelector('.nbu-image-caption');
            if (caption) {
                caption.innerHTML = `❌ 图片加载失败: <a href="${this.src}" target="_blank">${this.alt || '查看原图'}</a>`;
                caption.style.color = '#ef4444';
            }
        };
        
        // 添加加载状态
        img.onload = function() {
            this.parentElement.classList.add('nbu-image-loaded');
        };
    });
}

// 加载论文详情
async function loadPaperDetail() {
    const paperId = getPaperIdFromUrl();
    const container = document.getElementById('paper-detail-container');
    
    if (!paperId) {
        container.innerHTML = `
            <div class="nbu-error-state">
                <div class="nbu-error-icon">❌</div>
                <h3>无效的论文ID</h3>
                <p>请检查URL是否正确</p>
                <a href="/research/papers/" class="nbu-submit-btn">返回论文库</a>
            </div>
        `;
        return;
    }
    console.log("paperId: ", paperId);
    try {
        // 等待认证系统初始化
        if (!supabaseAdmin_d) {
            setTimeout(loadPaperDetail, 500);
            return;
        }
        
        const paper = await getPaperDetail(paperId);
        renderPaperDetail(paper);
        
    } catch (error) {
        console.error('加载论文详情失败:', error);
        container.innerHTML = `
            <div class="nbu-error-state">
                <div class="nbu-error-icon">❌</div>
                <h3>加载失败</h3>
                <p>${error.message}</p>
                <a href="/research/papers/" class="nbu-submit-btn">返回论文库</a>
            </div>
        `;
    }
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(loadPaperDetail, 100);
});