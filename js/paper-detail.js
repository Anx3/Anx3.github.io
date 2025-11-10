const supabaseUrl_d = "https://grgpsujmjbeuphwvxhpg.supabase.co";
const supabaseServiceKey_d = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3BzdWptamJldXBod3Z4aHBnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTIzNzExNCwiZXhwIjoyMDc0ODEzMTE0fQ.hy4_n74vuailNkPHWkt9YWINfQFsNuwLHNcg7knUlL4";
const supabaseAdmin_d = supabase.createClient(supabaseUrl_d, supabaseServiceKey_d);
// 获取URL中的论文ID
function getPaperIdFromUrl() {
    const path = window.location.pathname;
    const match = path.match(/\/research\/papers\/([^\/]+)/);
    return match ? match[1] : null;
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
            .eq('status', 'published')
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

// 渲染Markdown内容（简单版本）
function renderMarkdownContent(markdownText) {
    const contentElement = document.getElementById('paper-content');
    if (!contentElement) return;
    
    // 简单的Markdown解析（你可以后续使用专业的Markdown解析库）
    let html = markdownText
        // 标题
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // 粗体
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        // 斜体
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        // 代码块
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        // 行内代码
        .replace(/`(.*?)`/g, '<code>$1</code>')
        // 链接
        .replace(/\[([^\[]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>')
        // 换行
        .replace(/\n/g, '<br>');
    
    contentElement.innerHTML = html;
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