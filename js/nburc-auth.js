// Supabase配置
const supabaseUrl = "https://grgpsujmjbeuphwvxhpg.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3BzdWptamJldXBod3Z4aHBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMzcxMTQsImV4cCI6MjA3NDgxMzExNH0.0JrMADWxkwwJiPnuJ-Ah2Xz-JlBbBhd4KcYJzlPCfI8";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZ3BzdWptamJldXBod3Z4aHBnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTIzNzExNCwiZXhwIjoyMDc0ODEzMTE0fQ.hy4_n74vuailNkPHWkt9YWINfQFsNuwLHNcg7knUlL4";
let supabaseClient = null;
let supabaseAdmin = null;
let nbuAuthClient = null;
let selectedRole = null;
// 资料编辑功能
let currentUserProfile = null;

// NBU用户认证逻辑 - 修复刷新问题版
console.log("🔧 nburc-auth.js 开始加载");

// 初始化Supabase客户端
function initializeSupabase() {
    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase库未加载');
        return false;
    }
    supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);
    supabaseAdmin = supabase.createClient(supabaseUrl, supabaseServiceKey);
    console.log("✅ Supabase客户端已初始化");
    return true;
}

// 主要的初始化函数
async function initializeNBUAuth() {
    console.log("🚀 开始初始化Auth0客户端");
    
    try {
        // 检查Auth0库是否可用
        if (typeof auth0 === 'undefined') {
            console.error('❌ Auth0库未加载');
            return;
        }
        
        console.log("✅ Auth0库已加载，开始创建客户端实例");
        
        // 创建Auth0客户端
        nbuAuthClient = await auth0.createAuth0Client({
            domain: "dev-qajzo556g32cbm5b.us.auth0.com",
            clientId: "MCa52JMm0fAX4uAxRMOW636zkNU1wYN3",
            authorizationParams: {
                redirect_uri: "https://nburc.dpdns.org/"
            },
            cacheLocation: 'localstorage' // 明确指定使用localStorage持久化
        });

        console.log("🎉 Auth0客户端初始化成功!");
        
        // 处理认证流程（包括回调和状态检查）
        await handleAuthentication();
        
    } catch (error) {
        console.error("💥 Auth0初始化失败:", error);
    }
    startAuthComponentWatcher();
}

function startAuthComponentWatcher() {
    setInterval(() => {
        const loginSection = document.getElementById('nbu-login-section');
        const userSection = document.getElementById('nbu-user-section');
        
        if (!loginSection || !userSection) {
            console.log("🔍 定时检查: 认证组件丢失");
            location.reload(); // 或者执行更精细的修复
        }
    }, 1000);
}

// 处理所有认证相关逻辑
async function handleAuthentication() {
    const query = window.location.search;
    console.log("🔍 当前URL参数:", query);
    
    // 情况1：有回调参数（刚从Auth0跳转回来）
    if (query.includes('state=') && query.includes('code=')) {
        console.log("🔄 检测到Auth0回调，正在处理...");
        try {
            await nbuAuthClient.handleRedirectCallback();
            // 清除URL参数，避免重复处理
            window.history.replaceState({}, document.title, window.location.pathname);
            console.log("✅ 回调处理完成，URL已清理");
        } catch (error) {
            console.error("❌ 回调处理失败:", error);
        }
    }
    
    // 情况2：检查持久化登录状态（页面刷新或导航）
    await checkLoginStatus();
}

// 检查登录状态
async function checkLoginStatus() {
    if (!nbuAuthClient) {
        console.log("⚠️ 客户端未就绪，跳过状态检查");
        return;
    }
    
    try {
        const isAuthenticated = await nbuAuthClient.isAuthenticated();
        console.log("🔐 持久化登录状态:", isAuthenticated);
        
        await updateAuthUI();
        
    } catch (error) {
        console.error("❌ 检查登录状态时出错:", error);
    }
}

// 更新UI显示
async function updateAuthUI() {
    if (!nbuAuthClient) {
        console.log("⚠️ 客户端未就绪，跳过UI更新");
        return;
    }
    console.log("进入updateAuthUI");
    try {
        const isAuthenticated = await nbuAuthClient.isAuthenticated();
        console.log("🎨 更新UI，登录状态:", isAuthenticated);
        
        const loginSection = document.getElementById('nbu-login-section');
        const userSection = document.getElementById('nbu-user-section');
        
        if (!loginSection || !userSection) {
            console.error("❌ 找不到登录组件元素");
            return;
        }

        if (isAuthenticated) {
            // 用户已登录 - 获取用户信息和资料
            const user = await nbuAuthClient.getUser();
            console.log("👤 Auth0用户信息:", user);
            
            // 处理用户资料（创建或读取）
            const userProfile = await handleUserProfile(user);
            console.log("📊 用户资料:", userProfile);
            currentUserProfile = userProfile;
            
            // 更新UI显示
            document.getElementById('nbu-login-section').style.display = 'none';
            document.getElementById('nbu-user-section').style.display = 'block';
            
            // 显示用户信息（优先显示OC名，没有则显示邮箱）
            const displayName = userProfile?.oc_name || userProfile?.display_name || user.name || user.nickname || user.email || 'NBU用户';
            document.getElementById('nbu-user-name').textContent = displayName;
            document.getElementById('nbu-user-avatar').src = userProfile?.avatar_url || user.picture;
            console.log("👤 显示用户信息:", displayName);
            
            // 🎉 显示欢迎弹窗
            showWelcomeToast(displayName);
            
        } else {
            // 用户未登录
            document.getElementById('nbu-login-section').style.display = 'block';
            document.getElementById('nbu-user-section').style.display = 'none';
            currentUserProfile = null;
            console.log("🔓 显示登录按钮");
        }
        
    } catch (error) {
        console.error("❌ 更新UI时出错:", error);
    }
}

// 🎉 显示欢迎弹窗
function showWelcomeToast(displayName) {
    // 防止重复显示（比如页面刷新时）
    if (sessionStorage.getItem('nbu_welcome_shown')) {
        return;
    }
    
    // 创建弹窗元素
    const toast = document.createElement('div');
    toast.className = 'nbu-welcome-toast';
    toast.innerHTML = `
        <div class="nbu-toast-content">
            <span class="nbu-toast-icon">🎉</span>
            <div class="nbu-toast-text">
                <strong>Welcome back, ${displayName}!</strong>
                <span>欢迎回到NBU研究中心</span>
            </div>
            <button class="nbu-toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 标记为已显示
    sessionStorage.setItem('nbu_welcome_shown', 'true');
    
    // 3秒后自动消失
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 4000);
}

// 修改所有使用supabase的函数，添加检查
async function handleUserProfile(auth0User) {
    // 检查Supabase是否初始化
    if (!supabaseAdmin) {
        console.error('❌ Supabase客户端未初始化');
        return null;
    }
    try {
        const auth0UserId = auth0User.sub;
        const userEmail = auth0User.email;
        
        console.log("🔄 处理用户资料，Auth0 ID:", auth0UserId);
        
        // 1. 尝试读取现有资料
        const { data: existingProfile, error: readError } = await supabaseAdmin
            .from('user_profiles')
            .select('*')
            .eq('auth0_user_id', auth0UserId)
            .single();
        
        if (readError && readError.code !== 'PGRST116') { // PGRST116是"未找到记录"
            console.error("❌ 读取用户资料失败:", readError);
            return null;
        }
        
        // 2. 如果资料不存在，创建新资料
        if (!existingProfile) {
            console.log("📝 创建新用户资料");
            
            // 从sessionStorage获取选择的身份，然后清除
            const savedRole = sessionStorage.getItem('nbu_selected_role');
            if (savedRole) {
                sessionStorage.removeItem('nbu_selected_role');
            }
            const userRole = savedRole || selectedRole || 'visitor';
            
            const newProfile = {
                auth0_user_id: auth0UserId,
                role: userRole,
                display_name: auth0User.name || auth0User.nickname,
                avatar_url: auth0User.picture,
                bio: '',
                // OC字段根据身份决定是否初始化
                oc_name: userRole !== 'visitor' ? auth0User.name || '' : null,
                oc_age: userRole !== 'visitor' ? null : null,
                oc_nationality: userRole !== 'visitor' ? '' : null,
                oc_gender: userRole !== 'visitor' ? '' : null,
                oc_title: userRole !== 'visitor' ? '' : null
            };
            
            const { data: createdProfile, error: createError } = await supabaseAdmin
                .from('user_profiles')
                .insert([newProfile])
                .select()
                .single();
            
            if (createError) {
                console.error("❌ 创建用户资料失败:", createError);
                return null;
            }
            
            console.log("✅ 用户资料创建成功:", createdProfile);
            return createdProfile;
        }
        
        // 3. 资料已存在，直接返回
        console.log("✅ 读取现有用户资料:", existingProfile);
        return existingProfile;
        
    } catch (error) {
        console.error("❌ 处理用户资料时出错:", error);
        return null;
    }
}

// 登录函数 - 简化版
async function nbuHandleLogin() {
    console.log("🎯 登录按钮被点击");
    
    // 先检查是否已经登录
    if (!nbuAuthClient) {
        console.log("🔄 Auth客户端未初始化，正在初始化...");
        await initializeNBUAuth();
        if (!nbuAuthClient) {
            console.error("❌ Auth客户端初始化失败");
            return;
        }
    }
    
    // 直接检查登录状态，如果已登录就跳过
    const isAuthenticated = await nbuAuthClient.isAuthenticated();
    if (isAuthenticated) {
        console.log("ℹ️ 用户已登录，无需重复登录");
        await updateAuthUI();
        return;
    }
    
    // 直接跳转到Auth0登录页面
    console.log("🔐 跳转到Auth0登录页面");
    try {
        await nbuAuthClient.loginWithRedirect({
            authorizationParams: {
                redirect_uri: "https://nburc.dpdns.org/" // 确保这里是你研究中心的实际域名
            }
        });
    } catch (error) {
        console.error("❌ 登录跳转失败:", error);
    }
}

// 登出函数
async function nbuHandleLogout() {
    console.log("🎯 退出按钮被点击");
    
    // 清除欢迎弹窗标记
    sessionStorage.removeItem('nbu_welcome_shown');
    
    if (!nbuAuthClient) {
        console.error("❌ Auth客户端未初始化");
        return;
    }
    
    console.log("🚪 执行登出...");
    await nbuAuthClient.logout({
        logoutParams: {
            returnTo: "https://nburc.dpdns.org/"
        }
    });
}

// 确保函数在全局可用
window.nbuHandleLogin = nbuHandleLogin;
window.nbuHandleLogout = nbuHandleLogout;
if (initializeSupabase()) {
    initializeNBUAuth();
    updateAuthUI();
}

// 添加SPA导航监听
function setupSPANavigationListener() {
    console.log("🔧 设置SPA导航监听器");
    
    // 方法1: 监听URL变化（适用于大多数SPA框架）
    let currentUrl = window.location.href;
    const observeUrlChange = () => {
        const newUrl = window.location.href;
        if (newUrl !== currentUrl) {
            currentUrl = newUrl;
            console.log("🔄 URL变化检测到，重新渲染认证组件");
            setTimeout(updateAuthUI, 100); // 稍等DOM更新
        }
    };
    
    // 使用MutationObserver监听DOM变化
    const observer = new MutationObserver(() => {
        observeUrlChange();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // 方法2: 监听pushState和replaceState（处理history API）
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
        originalPushState.apply(this, args);
        console.log("🔄 pushState检测到，重新渲染认证组件");
        setTimeout(updateAuthUI, 100);
    };
    
    history.replaceState = function(...args) {
        originalReplaceState.apply(this, args);
        console.log("🔄 replaceState检测到，重新渲染认证组件");
        setTimeout(updateAuthUI, 100);
    };
    
    // 方法3: 监听页面点击事件（备用方案）
    document.addEventListener('click', (event) => {
        const link = event.target.closest('a');
        if (link && link.href && link.href.startsWith(window.location.origin)) {
            console.log("🔗 内部链接点击，准备重新渲染");
            // 稍等路由处理完成
            setTimeout(updateAuthUI, 300);
        }
    });
}

// 修改初始化函数
async function initializeNBUAuth() {
    console.log("🚀 开始初始化Auth0客户端");
    
    try {
        // 检查Auth0库是否可用
        if (typeof auth0 === 'undefined') {
            console.error('❌ Auth0库未加载');
            return;
        }
        
        console.log("✅ Auth0库已加载，开始创建客户端实例");
        
        // 创建Auth0客户端
        nbuAuthClient = await auth0.createAuth0Client({
            domain: "dev-qajzo556g32cbm5b.us.auth0.com",
            clientId: "MCa52JMm0fAX4uAxRMOW636zkNU1wYN3",
            authorizationParams: {
                redirect_uri: "https://nburc.dpdns.org/"
            },
            cacheLocation: 'localstorage'
        });

        console.log("🎉 Auth0客户端初始化成功!");
        
        // 处理认证流程
        await handleAuthentication();
        
        // 🆕 设置SPA导航监听
        setupSPANavigationListener();
        
    } catch (error) {
        console.error("💥 Auth0初始化失败:", error);
    }
}

// 论文提交功能
async function submitResearchPaper(paperData) {
    console.log("📝 开始提交论文:", paperData);
    
    if (!supabaseAdmin || !currentUserProfile) {
        alert('请先登录后再提交论文');
        return null;
    }
    
    try {
        const { data, error } = await supabaseAdmin
            .from('research_papers')
            .insert([{
                title: paperData.title,
                abstract: paperData.abstract,
                content: paperData.content,
                author_id: currentUserProfile.auth0_user_id,
                status: 'under_review',
                topics: paperData.topics || [],
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
            
        if (error) throw error;
        
        console.log("✅ 论文提交成功:", data);
        
        // 显示成功消息
        showSubmissionToast('success', '论文提交成功！等待审核。');
        return data;
        
    } catch (error) {
        console.error("❌ 论文提交失败:", error);
        showSubmissionToast('error', `提交失败: ${error.message}`);
        return null;
    }
}

// 获取用户自己的论文
async function getUserPapers() {
    if (!supabaseAdmin || !currentUserProfile) {
        console.log("⚠️ 用户未登录，无法获取论文");
        return [];
    }
    
    try {
        const { data, error } = await supabaseAdmin
            .from('research_papers')
            .select('*')
            .eq('author_id', currentUserProfile.auth0_user_id)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        return data || [];
        
    } catch (error) {
        console.error("❌ 获取用户论文失败:", error);
        return [];
    }
}

// 获取所有已发布的论文
async function getPublishedPapers() {
    if (!supabaseAdmin) {
        return [];
    }
    
    try {
        const { data, error } = await supabaseAdmin
            .from('research_papers')
            .select(`
                *,
                user_profiles (
                    display_name,
                    oc_name,
                    avatar_url
                )
            `)
            .eq('status', 'published')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        return data || [];
        
    } catch (error) {
        console.error("❌ 获取已发布论文失败:", error);
        return [];
    }
}

// 显示提交状态提示
function showSubmissionToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `nbu-submission-toast nbu-toast-${type}`;
    toast.innerHTML = `
        <div class="nbu-toast-content">
            <span class="nbu-toast-icon">${type === 'success' ? '✅' : '❌'}</span>
            <span class="nbu-toast-message">${message}</span>
            <button class="nbu-toast-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

// 使函数全局可用
window.submitResearchPaper = submitResearchPaper;
window.getUserPapers = getUserPapers;
window.getPublishedPapers = getPublishedPapers;