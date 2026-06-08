// ==UserScript==
// @name         AuOPRSn-SY-ErrCheck-AntiGhost
// @namespace    AuOPR
// @version      1.2.3
// @description  防幽灵定时器并发的 Wayfarer 错误检查
// @author       SnpSL & AI
// @match        https://nianticlabs.com*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // === 核心修复 1：利用 window 全局变量防多开 ===
    // 每次脚本加载时，如果发现已经有定时器在运行，立刻强行杀死它
    if (window.wayfarerErrorTimer) {
        console.log("【防重叠】检测到旧的冲突定时器，正在强行清理...");
        clearInterval(window.wayfarerErrorTimer);
    }

    // 每次执行脚本时，将计数器重置为 10（确保它是独立的 10 次试验）
    let errNumber = 10;
    let mywin = window;

    // === 核心修复 2：将定时器挂载到 window 唯一标识上 ===
    window.wayfarerErrorTimer = setInterval(() => {

        // 1. 莫名其妙的错误，倒计时负数重载
        let sc = document.getElementById("idcountdown");
        if(sc) {
            if(parseInt(sc.textContent) < -300) {
                console.log("error", "300秒重载");
                clearInterval(window.wayfarerErrorTimer); // 刷新前先清理
                mywin.location.reload();
                return;
            }
        }

        // 2. 检测机器人验证
        if(document.querySelector("div.rc-doscaptcha-body")){
            createNotify("傻逼了", {
                body: "被当成机器人了，歇菜了",
                icon: "https://githubusercontent.com",
                requireInteraction: true
            });
            clearInterval(window.wayfarerErrorTimer); // 遇到机器人验证，停止脚本
            return;
        }

        // 3. 检测到错误标签
        if(document.querySelector("app-review-error")) {
            console.log("=== 检测到错误 ===");
            let errbtn = document.querySelector('button[class="wf-button wf-button--primary"]');
            console.log("当前按钮:", errbtn);
            console.log("当前剩余重试次数 errNumber:", errNumber);

            if(!errbtn){
                console.log("找不到重试按钮，重载整个网页...");
                clearInterval(window.wayfarerErrorTimer);
                mywin.location.reload();
                return;
            }

            // === 核心修复 3：防御性拦截 ===
            // 如果次数已经耗尽，立刻清除当前定时器，防止死循环日志
            if(errNumber <= 0) {
                console.log("【拦截】重试次数已耗尽，已停止定时器。");
                clearInterval(window.wayfarerErrorTimer);

                createNotify("错误", {
                    body: "重试 10 次仍未成功，需要人工干预",
                    icon: "https://githubusercontent.com",
                    requireInteraction: true
                });
                return;
            }

            // 还有次数，执行点击并递减
            if(errbtn && errNumber > 0) {
                errNumber--;
                console.log("执行点击，更新后剩余次数:", errNumber);
                errbtn.click();
            }
        } else {
            // 如果当前页面完全没有错误提示，说明页面恢复正常，重置计数器
            if (errNumber !== 10) {
                errNumber = 10;
            }
        }
    }, 10000); // 10秒检查一次

    // 弹窗通知函数
    function createNotify(title, options) {
        if (Notification.permission === "granted") {
            var n = new Notification(title, options);
            n.onclick = () => { n.close(); mywin.focus(); };
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission(res => {
                if (res === "granted") {
                    var n = new Notification(title, options);
                    n.onclick = () => { n.close(); mywin.focus(); };
                }
            });
        }
    }

})();
