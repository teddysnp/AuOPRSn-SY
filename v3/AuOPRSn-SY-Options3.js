// ==UserScript==
// @name         AuOPRSn-SY-Options3.js
// @namespace    AuOPR
// @version      1.0
// @description  刷新/首次进入/new/自动跳help，点击mapview不拦截
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
    let isInitialized = false; // 防重复初始化
    let clickEventBinded = false; // 防重复绑定点击事件
    let isFirstEnter = true; // 标记是否是首次进入/new/（刷新/直接访问）
    const TARGET_ROUTE = '/new/'; // 目标入口路由
    const HELP_ROUTE = '/new/help'; // 自动跳转的目标路由
    const MAPVIEW_ROUTE = '/new/mapview'; // 用户可主动点击的路由

    // 节点等待轮询函数（保留原版逻辑）
    const awaitElement = get => new Promise((resolve, reject) => {
        let triesLeft = 15; // 增加轮询次数（适配路由跳转延迟）
        const queryLoop = () => {
            const ref = get();
            if (ref) resolve(ref);
            else if (!triesLeft) reject(new Error('节点查询超时'));
            else setTimeout(queryLoop, 250);
            triesLeft--;
        }
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

    // 初始路由处理：刷新/首次进入/new/ → 跳help；用户点击mapview不拦截
    const handleInitRoute = () => {
        // 初始URL判断：如果是/new/（刷新/直接访问），自动跳help
        if (window.location.pathname === TARGET_ROUTE && isFirstEnter) {
            console.log(`首次进入/刷新${TARGET_ROUTE}，自动跳转到${HELP_ROUTE}`);
            window.history.replaceState({}, document.title, HELP_ROUTE);
            isFirstEnter = false; // 标记首次进入完成
            return;
        }

        // 若初始URL是mapview，说明用户主动点击，不拦截
        if (window.location.pathname === MAPVIEW_ROUTE) {
            console.log(`用户主动访问${MAPVIEW_ROUTE}，不拦截`);
            isFirstEnter = false;
            return;
        }
    };

    // 路由监听：仅拦截「自动跳转」的mapview，不拦截用户主动点击
    const interceptRoute = () => {
        // 监听URL变化（仅处理首次自动跳转）
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        // 重写pushState（仅拦截首次自动跳转的mapview）
        history.pushState = function(state, title, url) {
            // 仅当「首次进入」且跳转mapview时，强制改help；用户主动点击则放行
            if (url && url.includes(MAPVIEW_ROUTE) && isFirstEnter) {
                console.log(`拦截首次自动跳转：${url} → 强制改为${HELP_ROUTE}`);
                originalPushState.call(history, state, title, HELP_ROUTE);
                isFirstEnter = false;
                return;
            }
            // 用户主动点击mapview，正常放行
            originalPushState.call(history, state, title, url);
        };

        // 重写replaceState（仅拦截首次自动替换的mapview）
        history.replaceState = function(state, title, url) {
            if (url && url.includes(MAPVIEW_ROUTE) && isFirstEnter) {
                console.log(`拦截首次自动替换：${url} → 强制改为${HELP_ROUTE}`);
                originalReplaceState.call(history, state, title, HELP_ROUTE);
                isFirstEnter = false;
                return;
            }
            originalReplaceState.call(history, state, title, url);
        };

        // 处理初始路由
        handleInitRoute();
    };

    // 核心初始化逻辑
    const init = async () => {
        if (isInitialized) {
            console.log('已初始化过，跳过重复执行');
            return;
        }

        // 1. 先处理路由（优先执行）
        interceptRoute();

        // 2. 等待sidebar父节点加载
        const parentDiv = await awaitElement(() =>
            document.querySelector('app-sidebar > :first-child > :first-child')
        );
        if (!parentDiv) {
            console.log('超时未找到目标父节点（app-sidebar）');
            return;
        }

        // 3. 定位第7个节点（协助）并修改为任务
        const assistItem = parentDiv.children[6];
        if (!assistItem) {
            console.log('未找到第7个子节点（协助）');
            return;
        }

        // 4. 修改文字和title
        const linkA = assistItem.querySelector('a');
        const textSpan = assistItem.querySelector('span.ng-star-inserted');
        if (linkA && textSpan) {
            linkA.title = '任务';
            textSpan.textContent = '任务';
            // 给任务节点绑定href到help路由
            linkA.href = HELP_ROUTE;
        } else {
            console.log('未找到节点内的a标签或显示文字的span标签');
            return;
        }

        // 5. 置顶任务节点
        parentDiv.insertBefore(assistItem, parentDiv.firstChild);
        console.log('操作完成：协助节点已移至首位并改名为任务');

        // 6. 强制激活任务节点（仅在help路由下激活）
        setTimeout(() => {
            if (window.location.pathname === HELP_ROUTE) {
                forceActiveMissionNode(assistItem);
            }
        }, 500);

        // 7. 绑定点击事件（仅一次）
        if (linkA && !clickEventBinded) {
            linkA.addEventListener('click', async (e) => {
                // 点击任务节点时，强制跳help并激活
                e.preventDefault();
                e.stopPropagation();
                window.history.replaceState({}, document.title, HELP_ROUTE);
                forceActiveMissionNode(assistItem);
            });
            clickEventBinded = true;
            console.log('点击事件绑定完成：点击任务节点跳help');
        }

        // 标记初始化完成
        isInitialized = true;
    };

    // 监听DOM加载完成后执行初始化
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }

    // 监听路由变化：help路由下激活任务节点，mapview路由下取消
    window.addEventListener('popstate', () => {
        if (!isInitialized) return;
        const missionNode = document.querySelector('app-sidebar > :first-child > :first-child > :first-child');
        if (window.location.pathname === HELP_ROUTE) {
            forceActiveMissionNode(missionNode);
        } else if (window.location.pathname === MAPVIEW_ROUTE) {
            // 用户跳mapview时，移除任务节点激活态
            if (missionNode) {
                const linkA = missionNode.querySelector('a');
                linkA?.classList.remove('active');
                missionNode.classList.remove('active');
            }
            console.log('用户主动进入mapview，取消任务节点激活');
        }
    });

})();
