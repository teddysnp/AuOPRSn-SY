// ==UserScript==
// @name         AuOPRSn-SY-Options3
// @namespace    AuOPR
// @version      1.4
// @description  修改侧边栏第三个标签为"任务"，并默认点击该标签（仅标签页首次加载触发）
// @author       SnpSL
// @match        https://wayfarer.nianticlabs.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // 等待元素加载完成（适配Angular异步渲染）
    function waitForElement(selector, callback, timeout = 15000) {
        const interval = 300;
        let elapsed = 0;
        const checkExist = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
                clearInterval(checkExist);
                callback(element);
            }
            elapsed += interval;
            if (elapsed >= timeout) {
                clearInterval(checkExist);
                console.log(`元素 ${selector} 超时未加载`);
            }
        }, interval);
    }

    // 1. 修改第三个sidebar-link的文本为"任务"（兼容原始文本）
    function modifyThirdSidebarLink() {
        const sidebarLinks = document.querySelectorAll('app-sidebar-link a.sidebar-link');
        if (sidebarLinks.length >= 3) {
            const thirdLink = sidebarLinks[2];
            // 修改span显示文本
            const textSpan = thirdLink.querySelector('span.ng-star-inserted');
            if (textSpan && textSpan.textContent !== '任务') {
                textSpan.textContent = '任务';
            }
            // 修改title属性
            if (thirdLink.getAttribute('title') !== '任务') {
                thirdLink.setAttribute('title', '任务');
            }
            console.log('第三个侧边栏标签已修改为"任务"');
        }
    }

    // 2. 仅当前标签页首次加载时激活"任务"标签（核心修改：改用sessionStorage）
    function activateTaskLinkOnlyFirstTime() {
        // 从sessionStorage读取标记（仅当前标签页有效，关闭标签页自动清空）
        const isFirstLoadInTab = sessionStorage.getItem('isFirstLoadInTab') !== 'false';

        if (isFirstLoadInTab) {
            const sidebarLinks = document.querySelectorAll('app-sidebar-link a.sidebar-link');
            if (sidebarLinks.length >= 3) {
                const thirdLink = sidebarLinks[2];
                const firstLink = sidebarLinks[0];

                // 移除第一个标签（地图）的激活状态
                firstLink.classList.remove('sidebar-link--active', 'active');
                // 给第三个标签添加激活状态
                thirdLink.classList.add('sidebar-link--active', 'active');
                // 模拟点击触发路由跳转
                thirdLink.click();

                // 标记当前标签页已非首次加载（刷新时生效）
                sessionStorage.setItem('isFirstLoadInTab', 'false');
                console.log('当前标签页首次加载，已默认激活"任务"标签');
            }
        } else {
            console.log('当前标签页非首次加载（刷新），保留当前页面激活状态');
        }
    }

    // 3. 替换wf-criteria内容为自定义任务面板
    function replaceWfCriteriaContent() {
        // 生成自定义任务面板HTML
        const currentTime = new Date().toLocaleString();
        const customHtml = `
            <div id="idmission" style="padding: 20px; color: #333; font-size: 14px;">
                <h2 style="margin: 0 0 15px 0; color: #007bff;">任务面板</h2>
                <p>✅ 已自动进入任务视图（刷新/首次进入/new/触发）</p>
                <p>更新时间：${currentTime}</p>
                <p>💡 点击「地图」可正常跳转到mapview</p>
            </div>
        `;

        // 等待wf-criteria元素加载后替换内容
        waitForElement('wf-criteria', (wfElement) => {
            // 清空原有内容
            wfElement.innerHTML = '';
            // 插入自定义内容
            wfElement.insertAdjacentHTML('afterbegin', customHtml);
            console.log('wf-criteria内容已替换为自定义任务面板');
        });
    }

    // 4. 监听侧边栏点击事件，仅点击"任务"时替换右侧内容
    function listenSidebarClick() {
        const sidebarLinks = document.querySelectorAll('app-sidebar-link a.sidebar-link');
        if (sidebarLinks.length >= 3) {
            const taskLink = sidebarLinks[2];
            // 绑定点击事件（防止重复绑定）
            taskLink.addEventListener('click', (e) => {
                // 延迟执行，确保路由跳转完成后再替换内容
                setTimeout(() => {
                    replaceWfCriteriaContent();
                }, 500);
            }, { once: false });
        }
    }

    // 主执行逻辑
    waitForElement('app-sidebar-link a.sidebar-link', () => {
        // 第一步：修改标签文本
        modifyThirdSidebarLink();
        // 第二步：仅当前标签页首次加载激活任务标签
        activateTaskLinkOnlyFirstTime();
        // 第三步：监听任务标签点击事件
        listenSidebarClick();

        // 如果是当前标签页首次加载，直接替换wf-criteria内容
            setTimeout(() => {
                replaceWfCriteriaContent();
            }, 800);
    });

})();
