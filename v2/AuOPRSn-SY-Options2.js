
// ==UserScript==
// @name         AuOPRSn-SY-Options2
// @namespace    AuOPR
// @version      1.0
// @description  AuOPRSn-SY-MissionManager : Create and modify the missions
// @author       SnpSL
// @match        https://pub-e7310217ff404668a05fcf978090e8ca.r2.dev/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require      https://unpkg.com/ajax-hook@2.0.3/dist/ajaxhook.min.js
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

  window.addEventListener('message', e => {
    const {
      type
    } = e.data;
      console.log("type",type);
      console.log("e",e);
    switch (type) {
      case 'ready':
        {
          break;
        }
    }
  });
  window.addEventListener('load', () => {
      let content = document.body.textContent;
      let content1 = JSON.parse(content);
      console.log(content1);
      //let content1 = JSON.parse(content.replace(/useremail/g,"审核人").replace(/datetime/g,"日期").replace(/performance/g,"评价"));
      let tmp = "<table><thead style='width:100%'><tr><th style='width:30%'>审核人</th><th style='width:5%'></th><th style='width:50%'>日期</th><th style='width:10%'>评价</th></tr></thead>";
      tmp+"<tbody>";
      for(let i=0;i<content1.length;i++){
          tmp+="<tr'><td>"+content1[i].useremail+"</td><td></td><td style='text-align: center;'>"+content1[i].datetime+"</td><td style='text-align: center;'>"+content1[i].performance+"</td></tr>";
      }
      tmp+="</tbody></table>";
      $("body").replaceWith("<body><p><p><div style='width:100%;display: flex;'><div style='width:5%'><span></span></div><div style='width:80%'>"+tmp+"</div></div></body>");
  });

    document.onreadystatechange = function(){
        console.log("onreadystatechange",document.readyState);
        console.log("onreadystatechange",document.URL);
    };

    //css
    (function() {
        const css = `
          .tb {
              display: flex;
              justify-content: flex-start;
              float: left;
          }
          .txtcenter {
            margin-left: 0em;
            text-align : center;
          }
        `;
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        document.querySelector('head').appendChild(style);
    })()

})();
