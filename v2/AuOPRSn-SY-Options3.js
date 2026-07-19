// ==UserScript==
// @name         AuOPRSn-SY-Options3
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  每隔 4 分钟在后台发送一次静默请求，防止 Niantic 网站超时断开登出
// @author       YourName
// @match        https://wayfarer.nianticlabs.com/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 辅助函数：从 Cookie 中获取指定的键值 (比如 XSRF-TOKEN)
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    function keepAlive() {
        console.log('[Wayfarer 保活] 正在发送会话维持请求...');

        // 动态获取当前的 CSRF Token
        const csrfToken = getCookie('XSRF-TOKEN');

        console.warn('[Wayfarer 保活] XSRF-TOKEN，',csrfToken);
        if (!csrfToken) {
            console.warn('[Wayfarer 保活] 未在本地 Cookie 中找到 XSRF-TOKEN，可能已经登出，准备刷新...');
            triggerReload('[原因] 缺少 Token');
            return;
        }

        fetch('https://wayfarer.nianticlabs.com/api/v1/vault/mapview/track/access', {
            method: 'POST',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'content-type': 'application/json',
                // 补齐系统校验的核心头部
                'x-angular': '',
                'x-csrf-token': csrfToken
            },
            body: JSON.stringify({ "zoomRange": "13-15" })
        })
        .then(response => {
            // 如果带上了正确的 Header 还返回 403 或 401，说明是真的登录过期了
            if (response.status === 403 || response.status === 401) {
                throw new Error(`身份验证真正过期 (HTTP ${response.status})`);
            }
            if (!response.ok) {
                throw new Error('HTTP 状态异常: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.code === "OK") {
                console.log('[Wayfarer 保活] 成功！带标记会话已成功续期。',data);
            } else {
                console.warn('[Wayfarer 保活] 服务器返回状态非 OK:', data);
                triggerReload('[原因] 接口返回错误代码');
            }
        })
        .catch(err => {
            console.error('[Wayfarer 保活] 请求发生错误:', err.message);
            triggerReload(`[原因] 触发自愈机制: ${err.message}`);
        });
    }

    function triggerReload(reason) {
        console.log('[Wayfarer 保活] 正在准备刷新页面... ' + reason);
        setTimeout(() => {
            location.reload();
        }, 1500);
    }

    function startDynamicTimer() {
        const minTime = 8 * 60 * 1000;
        const maxTime = 10 * 60 * 1000;
        const randomInterval = minTime + (Math.random() * (maxTime - minTime));

        console.log(`[Wayfarer 保活] 下一次保活请求将在 ${(randomInterval / 1000 / 60).toFixed(2)} 分钟后发送...`);

        setTimeout(() => {
            keepAlive();
            startDynamicTimer();
        }, randomInterval);
    }

    if (!window.location.pathname.includes('/login') && !window.location.href.includes('signin')) {
        console.log('[Wayfarer 保活] 脚本已激活（Header 伪装增强型）。');
        startDynamicTimer();
    }
})();
