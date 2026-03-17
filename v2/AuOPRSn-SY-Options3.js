// ==UserScript==
// @name         AuOPRSn-SY-Options3
// @namespace    AuOPR
// @version      0.2
// @description  自动点击 Wayfarer 登录及 Google 账号选择
// @author       SnpSL
// @match        https://*.nianticlabs.com/*
// @match        https://*.google.com/*
// @match        https://*.google.com*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const url = window.location.href;

    // 步骤 1: 在 Wayfarer 页面点击 Google 登录
    if (url.includes('://wayfarer.nianticlabs.com')) {
        setTimeout(() => {
            // 步骤 A: 查找并点击首页那个 class 为 sign-in-btn 的“登入”按钮
            const startLoginBtn = document.querySelector('.sign-in-btn');
            if (startLoginBtn) {
                console.log('检测到首页登入按钮，正在点击...');
                startLoginBtn.click();
                return; // 点击后页面会跳转或刷新，结束当前执行
            }

            // 步骤 B: 如果已经在登录方式选择页，查找 Google 按钮
            const googleBtn = Array.from(document.querySelectorAll('button'))
                                   .find(btn => btn.innerText.includes('Google'));
            if (googleBtn) {
                console.log('检测到 Google 登录选项，正在点击...');
                googleBtn.click();
            }
        }, 1200); // 稍微延迟，确保 Angular 框架 (ngcontent) 加载完成
    }

    // 步骤 2: 在 Google 账号选择页面（如果只有一个账号且已列出）
    if (url.includes('accounts.google.com')) {
        setTimeout(() => {
            // 查找账号列表项（通常包含邮箱地址）
            const accountItem = document.querySelector('div[role="link"][data-identifier]');
            // 或者是通用的账号选择器
            const emailInList = document.querySelector('div[data-email]');

            if (accountItem) {
                accountItem.click();
            } else if (emailInList) {
                emailInList.click();
            }

            // 步骤 3: 自动点击后续的“继续”或“确认”按钮
            const confirmBtn = Array.from(document.querySelectorAll('button span'))
                                    .find(span => span.innerText.includes('继续') || span.innerText.includes('Continue') || span.innerText.includes('确认'));
            if (confirmBtn) {
                confirmBtn.parentElement.click();
            }
        }, 1500);
    }
})();
