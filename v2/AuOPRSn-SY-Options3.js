// ==UserScript==
// @name         AuOPRSn-SY-Options3
// @namespace    AuOPR
// @version      1.2
// @description  刷新/首次进入/new/自动跳help，点击mapview不拦截，修复review提交后侧边栏重置
// @author       SnpSL
// @match        https://wayfarer.nianticlabs.com/*
// @require      https://ajax.aspnetcdn.com/ajax/jquery/jquery-1.9.1.min.js
// @require      https://unpkg.com/ajax-hook@2.0.3/dist/ajaxhook.min.js
// @connect      work-wayfarer.tydtyd.workers.dev
// @connect      kvworker-warfarer-mission.tydtyd.workers.dev
// @grant        GM_xmlhttpRequest
// @run-at       document-start  // 更早拦截初始路由
// ==/UserScript==

(function() {
    'use strict';

    // ========== 核心配置 ==========
    let clickEventBinded = false; // 防重复绑定点击事件
    let isFirstEnter = true; // 标记是否是首次进入/new/（刷新/直接访问）
    const TARGET_ROUTE = '/new/'; // 目标入口路由
    const HELP_ROUTE = '/new/help'; // 自动跳转的目标路由
    const MAPVIEW_ROUTE = '/new/mapview'; // 用户可主动点击的路由
    const REVIEW_ROUTE = '/new/review'; // 提交按钮跳转的路由

    // 节点等待轮询函数（增强：支持无限重试直到节点出现）
    const awaitElement = (get, maxTries = 30) => new Promise((resolve, reject) => {
        let triesLeft = maxTries;
        const queryLoop = () => {
            const ref = get();
            if (ref) resolve(ref);
            else if (!triesLeft) reject(new Error('节点查询超时'));
            else setTimeout(queryLoop, 300); // 延长轮询间隔，适配review页面加载
            triesLeft--;
        };
        queryLoop();
    }).catch(e => {
        console.log('awaitElement 错误：', e.message);
        return null;
    });

    // 替换app-help容器为任务面板内容
    const replaceAppHelpContent = async (missionNode) => {
        const helpContainer = await awaitElement(() => document.querySelector('app-help'));
        if (!helpContainer || !missionNode) return;

        // 仅当容器未替换时执行
        if (!helpContainer.innerHTML.includes('任务面板')) {
            helpContainer.innerHTML = `
                <div id="idmission" style="padding: 20px; color: #333; font-size: 14px;">
                    <h2 style="margin: 0 0 15px 0; color: #007bff;">任务面板</h2>
                    <p>✅ 已自动进入任务视图（刷新/首次进入/new/触发）</p>
                    <p>更新时间：${new Date().toLocaleString()}</p>
                    <p>💡 点击「地图」可正常跳转到mapview</p>
                </div>
            `;
            console.log('app-help容器替换完成：显示任务面板');
        }
    };

    // 强制激活任务节点（移除其他节点激活态 + 绑定内容）
    const forceActiveMissionNode = (missionNode) => {
        if (!missionNode) return;

        // 移除所有sidebar节点的active类
        document.querySelectorAll('app-sidebar a').forEach(el => el.classList.remove('active'));
        // 给任务节点添加激活态
        const linkA = missionNode.querySelector('a');
        if (linkA) {
            linkA.classList.add('active');
            missionNode.classList.add('active');
        }

        // 替换任务面板内容
        replaceAppHelpContent(missionNode);
    };

    // ========== 核心：侧边栏修复逻辑（支持重复执行） ==========
    const fixSidebar = async () => {
        // 1. 等待sidebar父节点加载（无限重试直到出现）
        const parentDiv = await awaitElement(() =>
            document.querySelector('app-sidebar > :first-child > :first-child'),
            0 // 0 = 无限重试，直到节点出现
        );
        if (!parentDiv) {
            console.log('未找到目标父节点（app-sidebar）');
            return null;
        }

        // 2. 定位目标节点：优先找已改造的“任务”节点，否则找第7个（协助）
        let missionItem = null;
        // 遍历子节点找文字为“任务”的节点
        Array.from(parentDiv.children).forEach(child => {
            const text = child.querySelector('span.ng-star-inserted')?.textContent?.trim();
            if (text === '任务') {
                missionItem = child;
            }
        });
        // 未找到则取第7个节点
        if (!missionItem) {
            missionItem = parentDiv.children[6];
            if (!missionItem) {
                console.log('未找到第7个子节点（协助）');
                return null;
            }
        }

        // 3. 修改文字/title/href（兼容重复执行）
        const linkA = missionItem.querySelector('a');
        const textSpan = missionItem.querySelector('span.ng-star-inserted');
        if (linkA && textSpan) {
            if (linkA.title !== '任务') linkA.title = '任务';
            if (textSpan.textContent.trim() !== '任务') textSpan.textContent = '任务';
            if (linkA.href.indexOf(HELP_ROUTE) === -1) linkA.href = HELP_ROUTE;
        } else {
            console.log('未找到节点内的a标签或显示文字的span标签');
            return null;
        }

        // 4. 置顶任务节点（仅当不在首位时执行）
        if (parentDiv.firstChild !== missionItem) {
            parentDiv.insertBefore(missionItem, parentDiv.firstChild);
            console.log('操作完成：任务节点已移至首位');
        }

        // 5. 绑定点击事件（仅一次）
        if (linkA && !clickEventBinded) {
            linkA.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.history.replaceState({}, document.title, HELP_ROUTE);
                forceActiveMissionNode(missionItem);
            });
            clickEventBinded = true;
            console.log('点击事件绑定完成：点击任务节点跳help');
        }

        // 6. 根据当前路由激活/取消激活
        if (window.location.pathname === HELP_ROUTE) {
            forceActiveMissionNode(missionItem);
        } else if (window.location.pathname === MAPVIEW_ROUTE || window.location.pathname === REVIEW_ROUTE) {
            const linkA = missionItem.querySelector('a');
            linkA?.classList.remove('active');
            missionItem.classList.remove('active');
        }

        return missionItem;
    };

    // 初始路由处理：适配review路由
    const handleInitRoute = () => {
        console.log('handleInitRoute',window.location.pathname);
        // 初始URL判断：new/ → 跳help；review路由标记首次进入完成
        if (window.location.pathname === TARGET_ROUTE && isFirstEnter) {
            console.log(`首次进入/刷新${TARGET_ROUTE}，自动跳转到${HELP_ROUTE}`);
            window.history.replaceState({}, document.title, HELP_ROUTE);
            isFirstEnter = false;
            return;
        }
        if (window.location.pathname === MAPVIEW_ROUTE || window.location.pathname === REVIEW_ROUTE) {
            console.log(`用户访问${window.location.pathname}，标记首次进入完成`);
            isFirstEnter = false;
            return;
        }
    };

    // 路由监听：拦截自动跳转+监听review路由
    const interceptRoute = () => {
        // 重写pushState/replaceState
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        const rewriteHistory = (originalFn) => {
            return function(state, title, url) {
                // 拦截首次自动跳转mapview
                if (url && url.includes(MAPVIEW_ROUTE) && isFirstEnter) {
                    console.log(`拦截首次自动跳转：${url} → 强制改为${HELP_ROUTE}`);
                    originalFn.call(history, state, title, HELP_ROUTE);
                    isFirstEnter = false;
                    return;
                }
                // 新增：所有路由修改都触发侧边栏修复（覆盖侧边栏点击）
                if (url && url.startsWith('/new/')) {
                    console.log(`检测到侧边栏路由跳转：${url}，执行修复`);
                    setTimeout(fixSidebar, 200); // 缩短延迟，适配DOM渲染
                }
                // 监听跳转到review路由，执行侧边栏修复
                if (url && url.includes(REVIEW_ROUTE)) {
                    console.log(`检测到跳转到review路由，修复侧边栏`);
                    setTimeout(fixSidebar, 500); // 延迟修复，等DOM渲染完成
                }
                originalFn.call(history, state, title, url);
            };
        };

        history.pushState = rewriteHistory(originalPushState);
        history.replaceState = rewriteHistory(originalReplaceState);

        // 处理初始路由
        handleInitRoute();
    };

    // 监听“送出”按钮点击（提前拦截+修复侧边栏）
    const listenSubmitButton = async () => {
        // 无限等待按钮出现
        const submitBtn = await awaitElement(() =>
            document.querySelector('button.wf-button.wf-split-button__main.wf-button--primary'),
            0
        );
        if (!submitBtn) return;

        submitBtn.addEventListener('click', () => {
            console.log('检测到“送出”按钮点击，预修复侧边栏');
            // 按钮点击后延迟修复（适配页面跳转/刷新）
            setTimeout(fixSidebar, 800);
        });
        console.log('“送出”按钮点击监听已绑定');
    };

    // 监听DOM变化（侧边栏重渲染时自动修复）
    const listenSidebarDOMChange = async () => {
        const sidebarRoot = await awaitElement(() => document.querySelector('app-sidebar'), 0);
        if (!sidebarRoot) return;

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
                    console.log('检测到侧边栏DOM变化，自动修复');
                    fixSidebar();
                    break;
                }
            }
        });

        observer.observe(sidebarRoot, {
            childList: true,
            subtree: true,
            attributes: false
        });
        console.log('侧边栏DOM变化监听已启动');
    };

    // 监听AJAX请求（review接口触发修复）
    const listenReviewAjax = () => {
        ah.hook({
            onRequest: (config, handler) => {
                // 拦截包含review的接口请求
                if (config.url.includes('review')) {
                    console.log('ajax检测到review接口请求，准备修复侧边栏');
                    setTimeout(fixSidebar, 1000);
                }
                handler.next(config);
            },
            onResponse: (res, handler) => {
                if (res.config.url.includes('review')) {
                    console.log('ajax review接口响应完成，修复侧边栏');
                    setTimeout(fixSidebar, 500);
                }
                handler.next(res);
            }
        });
        console.log('Review接口AJAX监听已启动');
    };

    // 核心初始化逻辑
    const init = async () => {
        // 1. 路由拦截
        interceptRoute();

        // 2. 首次修复侧边栏
        await fixSidebar();

        // 3. 并行启动所有监听
        listenSubmitButton();
        listenSidebarDOMChange();
        listenReviewAjax();

        // 4. 监听路由变化（popstate）
        window.addEventListener('popstate', () => {
            console.log('路由变化：', window.location.pathname);
            fixSidebar();
        });

        // 5. 监听页面加载完成（review页面刷新后修复）
        window.addEventListener('load', () => {
            console.log('页面加载完成，修复侧边栏');
            fixSidebar();
        });
    };

    // 启动初始化（兼容DOM加载状态）
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

})();
