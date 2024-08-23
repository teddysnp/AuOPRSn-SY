// ==UserScript==
// @name         AuOPRSn-SY
// @namespace    http://tampermonkey.net/
// @version      3.0.5
// @description  审po专用
// @author       snpsl
// @updateURL    https://github.com/teddysnp/AuOPRSn-SY/raw/main/AutOPRSn-SY.js
// @downloadURL  https://github.com/teddysnp/AuOPRSn-SY/raw/main/AutOPRSn-SY.js
// @match        https://wayfarer.nianticlabs.com/*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require      https://unpkg.com/ajax-hook@2.0.3/dist/ajaxhook.min.js
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// ==/UserScript==

//2.4.3  1.本地po，某项随机4或5分从第二个开始；2.Edit时，滚动到地图区域
window.pageData;
window.reviewData;
window.editData;
window.photoData;
window.AudioContext = window.AudioContext || window.webkitAudioContext;

var chsaddr=null;
var engaddr=null;
var lastchsaddr=null;
var lastengaddr=null;
var iHaveRate="false";
var iSubmit="false";
var sspos=null;
var private1=[41.7485825,123.4324825,230,380];
var private2=[41.803847,123.357713,910,920];
var private3=[42.2828685,125.738134,3408,5517];
var private4=[41.755547, 123.288777,940,1140];
var private5=[41.81979911, 123.25708028,910,920];
//var private1=[27.084545,119.585624,940,1140];
var bdisplaychsaddr = 1; //中文地址，0:取;1:不取
var skey="";  //You need input your own key at the showcase page!

// xhrPromise1 getAddr1 UserSubmit
//XMLHttpRequest.prototype.open
//document.addEventListener('DOMNodeInserted', function()
//window.onload

autoPR = {
    initSettings: {
        scriptTimeout: 3, //脚本延时（秒）
        endlineTime : 20 ,//审po可用时间：20分钟
        portalTime: 0,
        postPeriod: [28, 35], // 提交周期（秒）
        itimeout:180,  //超时
        autoReview: 'false'     //是否自动审
    },
//    chsaddr : null,      //中文地址
//    engaddr : null,      //英文地址
//    addrgoing:0,         //地址请求中，0:未请求;1:请求中
//    lastchsaddr : null,  //前一个中文地址
    lastengaddr : null,  //前一个英文地址
    useremail: null,
    username:  null,
    userlist: [],
    pagepass: '',
    portalData: {},
    latlon:[],
    settings: null,
    privatePortal: ["占位po"],
    pausePortal: [],
    privatePortalDisplay1: 30,
    privatePortalDisplay2: 20,

    saveLocalUserReview:function () {
//        localuserreviewdata.push(JSON.parse(localStorage.getItem(useremail)));
        localStorage.setItem(useremail, JSON.stringify(localuserreviewdata));
    },
    saveSettings:function () {
        var inputSettings = $("#autoCloudSettings").val();
        if (inputSettings == "") {
            autoPR.settings = autoPR.initSettings;
            $("#autoCloudSettings").val(JSON.stringify(autoPR.settings));
        } else {
            try {
                var temp = JSON.parse(inputSettings);
            } catch (err) {
                console.error("settings无法识别", err);
                alert("settings无法识别，请检查格式！");
                return;
            }
            autoPR.settings = temp;
        }
        localStorage.setItem(
            "autoCloud-settings",
            JSON.stringify(autoPR.settings)
        );
        console.log("settings设置成功");
        alert("settings设置成功");
    },
    saveStartTime: function () {
        if(typeof(pageData)!="undefined"){
          if (pageData.id== localStorage["portalID"]) return;
          localStorage.setItem("portalID", pageData.id);
          localStorage.setItem("portalTime", new Date().valueOf());
        }
    },
    saveKey:function (){
        var stmp="";
        console.log(document.querySelector("input[id='sskey']"));
        stmp=document.querySelector("input[id='sskey']").value;
        localStorage.setItem("txskey", stmp);
    },
    startstopAuto: function  ()
    {
//      PlaySound();
      if (autoPR.settings.autoReview=='true') {
          autoPR.settings.autoReview = 'false';
          $("#autoRev").replaceWith('<span style="color:red" id = "autoRev" > 手动 </span>')
       } else {
           autoPR.settings.autoReview = 'true';
           $("#autoRev").replaceWith('<span style="color:red" id = "autoRev" > 自动 </span>')
       }

      localStorage.setItem("autoReview", autoPR.settings.autoReview );
    },
    commitFrm: function ()
    {
        console.log(document.querySelector("input[type='submit']"));
        //
    },
    // 请求
    xhrPromise: function (method, url, data, headers = null) {
        if (headers == null)
            headers = {
                "Content-Type": "application/json",
            };

        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: method,
                url: url,
                data: JSON.stringify(data),
                headers: headers,
                onload: resolve,
                onerror: reject,
            });
        });
    },
    xhrPromise1: function (method, url, data, headers = null) {
        if (headers == null)
            headers = {
                "Content-Type": "application/json",
            };
            GM_xmlhttpRequest({
                method: method,
                url: url,
                data: JSON.stringify(data),
                headers: headers,
                onload: function(res){
                        let a=res.responseText.replace('QQmap&&QQmap(','');
                        a = a.slice(0,a.length-1);
                        console.log(JSON.parse(a));
                        chsaddr=JSON.parse(a).result.address;
                        autoPR.addrgoing = 0;
                        console.log(chsaddr);
                },
                onerror: function(err){
                    console.log('err:'+err);
                    return err;
                },
        });
    },
    // 根据latlng从腾讯API获取地址信息
    getAddr: async function (lat, lng) {
        var resp = autoPR.xhrPromise(
            "GET",
            "https://apis.map.qq.com/ws/geocoder/v1/?location=" +
                lat +
                "," +
                lng +
                "&output=jsonp&poi_options=address_format=short&key="+skey,
            ""
        );
        console.log(lat+','+lng);
        console.log('resp:'+resp);
        return resp;
    },
    // 根据latlng从腾讯API获取地址信息
    getAddr1: async function (lat, lng) {
        var resp = autoPR.xhrPromise1(
            "GET",
            "https://apis.map.qq.com/ws/geocoder/v1/?location=" +
                lat +
                "," +
                lng +
                "&output=jsonp&poi_options=address_format=short&key="+skey,
            ""
        );
        return resp;
    },
    //经纬度转化为中文地址方法,出错jsonp找不到，需增加引用
    getAreaCode : async function(latitude , longitude) {
          let params = {
              location: latitude + ',' + longitude,
              key: skey,
              output: 'jsonp',
              poi_options : "1"
          }
          this.$jsonp("https://apis.map.qq.com/ws/geocoder/v1/",
                      //https://apis.map.qq.com/tools/locpicker?search=1&type=1&referer=myapp",
                      params).then(res => {
                        console.log(res);
                        chsaddr = res.result.address;
                    });
    },

    //解析地址
    jiexiaddress:function(lat,lng){
        var url3 = encodeURI("https://apis.map.qq.com/ws/geocoder/v1/?location=" + lat + "," + lng + "&key="+skey+"&output=jsonp&&callback=?");
        $.getJSON(url3, function (result) {
                    console.log(result);
                if(result.result!=undefined){
                    console.log(result);
//                    console.log(JSON.stringify(result.result));
//                    chsaddr=result.result.address;
                }
        })
    },
    ajaxaddress : function(lat,lng){
        $.ajax({
            type: 'get',
            url: 'https://apis.map.qq.com/ws/geocoder/v1',
            dataType: 'jsonp',
            data: {
                key: skey,//开发密钥
                location: lat + "," + lng,//位置坐标
                get_poi: "0",  //是否返回周边POI列表：1.返回；0不返回(默认)
                poi_options : "1",
//                coord_type: "1",//输入的locations的坐标类型,1 GPS坐标
//                parameter: { "scene_type": "tohome", "poi_num": 20 },//附加控制功能
                output: "jsonp"
            },
            success: function (data, textStatus) {
                if (data.status == 0) {
//                    var address = data.result.formatted_addresses.recommend;
                    //$("#address").html(address);
                    console.log(data);
                    console.log(data.result.address + address);
                    chsaddr = data.result.address;
                } else {
                    console.log("位置获取错误，请联系管理员！")
                }
            },
            error: function () {
                console.log("Error! 位置获取错误，请联系管理员！")
            }
        });
    },

    UserSubmit : function(){

//        if(!pageData) return;

        let ibaserate=0;
        let spos="";
        let ibran1 = 0;
        let ibran2 = 0;
        let radscore=0;
        if (autoPR.privatePortal.indexOf(pageData.title)>0){
            ibaserate=4; //池中
            spos="池中:";
        } else if(pageData.type=="NEW" ){
//            console.log('streetAddress : '+pageData.streetAddress);
//            console.log("本地判断："+pageData.streetAddress.indexOf("Shen Yang")>0 || pageData.streetAddress.indexOf("Liao Ning")>0
//               || pageData.streetAddress.indexOf("Ji Lin")>0 || pageData.streetAddress.indexOf("Shenyang")>0
//               || pageData.streetAddress.indexOf("通化市")>0 || pageData.streetAddress.indexOf("吉林省")>0
//                       || pageData.streetAddress.indexOf("Liaoning")>0);
            if( pageData.streetAddress.indexOf("Shen Yang")>0 || pageData.streetAddress.indexOf("Liao Ning")>0
               || pageData.streetAddress.indexOf("Ji Lin")>0 || pageData.streetAddress.indexOf("Shenyang")>0
               || pageData.streetAddress.indexOf("通化市")>0 || pageData.streetAddress.indexOf("吉林省")>0
               || pageData.streetAddress.indexOf("Liaoning")>0 || pageData.streetAddress.indexOf("辽宁省")>0
              ){
            ibaserate=3; //本地
            spos="本地:";
            }

        else
        {
            ibaserate=2; //外地
            spos="外地:";
        }

            if((pageData.lat>private1[0]-private1[2]/100000 & pageData.lat<private1[0]+private1[2]/100000 & pageData.lng>private1[1]-private1[3]/100000 & pageData.lng<private1[1]+private1[3]/100000) ||
               (pageData.lat>private2[0]-private2[2]/100000 & pageData.lat<private2[0]+private2[2]/100000 & pageData.lng>private2[1]-private2[3]/100000 & pageData.lng<private2[1]+private2[3]/100000) ||
               (pageData.lat>private3[0]-private3[2]/100000 & pageData.lat<private3[0]+private3[2]/100000 & pageData.lng>private3[1]-private3[3]/100000 & pageData.lng<private3[1]+private3[3]/100000) ||
               (pageData.lat>private4[0]-private4[2]/100000 & pageData.lat<private4[0]+private4[2]/100000 & pageData.lng>private4[1]-private4[3]/100000 & pageData.lng<private4[1]+private4[3]/100000) ||
               (pageData.lat>private5[0]-private5[2]/100000 & pageData.lat<private5[0]+private5[2]/100000 & pageData.lng>private5[1]-private5[3]/100000 & pageData.lng<private5[1]+private5[3]/100000)
               )
            {
                ibaserate=4; //池中
                spos="池中:";
            }

        }

//        console.log("pageData.streetAddress:"+pageData.streetAddress);
//        console.log("ibaserate:"+ibaserate+" ; spos:"+spos);
        //新
        if(pageData.type=="NEW"){
            // Star rating
            const ratingElementParts = document.getElementsByClassName("wf-review-card");
//            console.log(document.querySelector('#appropriate-card').querySelector('button[class="wf-button thumbs-button wf-button--icon"]'));
            if(document.querySelector('#appropriate-card').querySelector('button[class="wf-button thumbs-button wf-button--icon"]'))
               { //适当
               document.querySelector('#appropriate-card').querySelector('button[class="wf-button thumbs-button wf-button--icon"]').click();
               }
            if(document.querySelector('#safe-card').querySelector('button[class="wf-button thumbs-button wf-button--icon"]'))
               {  //安全
               document.querySelector('#safe-card').querySelector('button[class="wf-button thumbs-button wf-button--icon"]').click();
               }
            if(document.querySelector('#accurate-and-high-quality-card').querySelector('button[class="wf-button thumbs-button wf-button--icon"]'))
               {  //准确
               document.querySelector('#accurate-and-high-quality-card').querySelector('button[class="wf-button thumbs-button wf-button--icon"]').click();
               }
            if(document.querySelector('#permanent-location-card').querySelector('button[class="wf-button thumbs-button wf-button--icon"]'))
               {  //永久
               document.querySelector('#permanent-location-card').querySelector('button[class="wf-button thumbs-button wf-button--icon"]').click();
               }
            if(document.querySelector('#socialize-card').querySelector('button[class="wf-button thumbs-button wf-button--icon"]'))
               {  //社交
               document.querySelector('#socialize-card').querySelector('button[class="wf-button thumbs-button wf-button--icon"]').click();
               }
            if(document.querySelector('#exercise-card').querySelector('button[class="wf-button thumbs-button wf-button--icon"]'))
               {  //运动
               document.querySelector('#exercise-card').querySelector('button[class="wf-button thumbs-button wf-button--icon"]').click();
               }
            if(document.querySelector('#explore-card').querySelector('button[class="wf-button thumbs-button wf-button--icon"]'))
               {  //探索
               document.querySelector('#explore-card').querySelector('button[class="wf-button thumbs-button wf-button--icon"]').click();
               }
            for(let k = 0; k < ratingElementParts.length; k++){
                radscore=ibaserate;
                const starButtons = ratingElementParts[k].getElementsByClassName("wf-rate__star");
                if (starButtons.length ) {
                //随机改一个值
                //池中,改一个为4-5
                if(ibaserate==4 & ibran1<1 & Math.random()>0.5 &k>0){   //k>0，第一个分不改，改后面的
                    radscore=Math.floor(3.0 + Math.random());
                    ibran1=2;
                }else
                //本地,改二个为4-5
//                console.log("radscore:"+radscore+" ; ibran2:"+ibran2);
                if(ibaserate==3 & ibran2<3 & Math.random()>0.4){
                    radscore=Math.round(2.0 + Math.random()*2);
                    ibran2++;
                }else
                //外地,改三个为3-5
                if(ibaserate==2 & ibran2<4 & Math.random()>0.4){
                    radscore=Math.floor(2+ Math.random() * 2);
                    ibran2++;
                }

                starButtons[radscore].click();
                spos+=radscore+1;
                }
//                console.log("spos:"+spos);
                sspos=spos;
            }

            //分类
            const opts = document.querySelectorAll('mat-button-toggle');
//                console.log(opts);
            for (let i = 0; i < opts.length; i++) {
//                console.log(opts[i]);
            if (!opts[i].classList.contains('mat-button-toggle-checked')) {
                opts[i].querySelector('button').click();
//                break;
               }
            }
//        document.querySelector('flex justify-center mt-8 ng-star-inserted').scrollIntoView({ block: 'start' });
//        document.querySelector('app-review').scrollIntoView({ block: 'start' });

//            document.querySelector('mat-button-toggle:nth-child(2) button').click();
        }

        //修改
        if(pageData.type=="EDIT"){
            const opt = document.querySelectorAll('mat-radio-button label')[0];
            const opt1 = document.querySelectorAll('agm-map div[role="button"]')[0];
            if (opt1) {
                opt1.scrollIntoView(true);   //地图不在视野内的时候，元素不加载，所以滚动到此，使其加载
                opt1.click();
//                console.log("map click!");
            }
            if (opt) {
                opt.scrollIntoView(true);   //地图不在视野内的时候，元素不加载，所以滚动到此，使其加载
                opt.click();
            }
//            console.log("opt1:");
//            console.log(opt1);
        }

        //图片
        if(pageData.type=="PHOTO"){
            const photo = document.querySelectorAll('app-review-photo app-photo-card .photo-card')[0];
            console.log(photo);
            if (photo) photo.click();
        }

        $("#userscore").replaceWith("<span id='userscore'>"+spos+"</span>");
        iHaveRate="true";
    },
    UserEditBugTemp : function(){
        //修改
        if(pageData.type=="EDIT"){
            const opt = document.querySelectorAll('mat-radio-button label')[0];
            const opt1 = document.querySelectorAll('agm-map div[role="button"]')[0];
            if (opt1) {
                opt1.click();
//                console.log("map click!");
            }
            if (opt) {opt.click();}
//            console.log("opt1:");
//            console.log(opt1);
        }
    },

};   //calss autoPR

//格式化日期函数
function formatDate(date, fmt)
{
	date = date == undefined ? new Date() : date;
	date = typeof date == 'number' ? new Date(date) : date;
	fmt = fmt || 'yyyy-MM-dd HH:mm:ss';
	var obj =
	{
		'y': date.getFullYear(), // 年份，注意必须用getFullYear
		'M': date.getMonth() + 1, // 月份，注意是从0-11
		'd': date.getDate(), // 日期
		'q': Math.floor((date.getMonth() + 3) / 3), // 季度
		'w': date.getDay(), // 星期，注意是0-6
		'H': date.getHours(), // 24小时制
		'h': date.getHours() % 12 == 0 ? 12 : date.getHours() % 12, // 12小时制
		'm': date.getMinutes(), // 分钟
		's': date.getSeconds(), // 秒
		'S': date.getMilliseconds() // 毫秒
	};
	var week = ['天', '一', '二', '三', '四', '五', '六'];
	for(var i in obj)
	{
		fmt = fmt.replace(new RegExp(i+'+', 'g'), function(m)
		{
			var val = obj[i] + '';
			if(i == 'w') return (m.length > 2 ? '星期' : '周') + week[val];
			for(var j = 0, len = val.length; j < m.length - len; j++) val = '0' + val;
			return m.length == 1 ? val : val.substring(val.length - m.length);
		});
	}
	return fmt;
}

//截获发送的请求
const originOpen1 = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (_, url) {
//    console.log(url);
//    alert(url);

  let arg0 = arguments[0];
//    console.log(arguments);

  //登录后，得到登录的邮箱和用户名
  if (url === "/api/v1/vault/properties") {
//      console.log(url);
    if (arg0 == 'GET') {     //刷新页面
    const xhr = this;
    const getter = Object.getOwnPropertyDescriptor(
      XMLHttpRequest.prototype,
      "response"
    ).get;
    Object.defineProperty(xhr, "response", {
      get: () => {
        let result = getter.call(xhr);
        try {
          const res = JSON.parse(result).result;
//          console.log(result);
          console.log(res);
          if(res){
              autoPR.useremail = res.socialProfile.email;
              autoPR.username = res.socialProfile.name;
//          console.log(autoPR.useremail);
          console.log(autoPR.username);
              if(autoPR.username != null ){
                  localStorage.setItem("currentUser", JSON.stringify(autoPR.username));
                  var userlist = JSON.parse(localStorage.getItem("userList"));
//              console.log(userlist);
                  if(userlist === null) {userlist = [];};
                  if(userlist.indexOf(autoPR.username)<0){
                  userlist.push(autoPR.username);
//                  console.log(userlist);
                  localStorage.setItem("userList", JSON.stringify(userlist));
                  }
              }
          }

          return result;
        } catch (e) {
            console.log(e);
          return result;
        }
      },
    }
   );
  }
 }


  if (url === "/api/v1/vault/review") {
//      console.log(url);
    if (arg0 == 'GET') {     //刷新页面
    const xhr = this;
    const getter = Object.getOwnPropertyDescriptor(
      XMLHttpRequest.prototype,
      "response"
    ).get;
    Object.defineProperty(xhr, "response", {
      get: () => {
        let result = getter.call(xhr);
        try {
            const res = JSON.parse(result).result;
//          console.log(result);
//          console.log(res);
            pageData = res ;


            autoPR.portalData = {
              captcha: pageData.captcha,
              type: pageData.type,
              id: pageData.id,
              imageUrl: pageData.imageUrl,
              title: pageData.title,
              description: pageData.description,
              streetAddress: pageData.streetAddress,
              lat: pageData.lat,
              lng: pageData.lng,
              pageData: JSON.stringify(pageData),
              salt: window.localStorage["salt"],
              author: localStorage["username"],
        };
//            console.log(pageData);
            //发送一次请求中文地址
            if((lastengaddr!=null & engaddr!=lastengaddr) || (chsaddr == lastchsaddr) )
            {
                if(autoPR.addrgoing == 0){
                    if(bdisplaychsaddr==0){
                        autoPR.getAddr1(pageData.lat,pageData.lng);
                    }
                    autoPR.addrgoing = 1;
                }
            }
//            console.log(typeof pageData.streetAddress);
            if( typeof pageData.streetAddress == "undefined") {autoPR.portalData.streetAddress=""; engaddr = "";}
            else { engaddr = pageData.streetAddress; }
       // 保存审当前po的起始时间
       autoPR.saveStartTime();
       iSubmit="false";
       iHaveRate="false";

       return result;
        } catch (e) {
          return result;
        }
      },
    }
   );

  }
    //截获提交请求，用于更新本地审po记录
    if (arg0 == 'POST'){    //提交数据
//        console.log(arguments[0]);
         let send = this.send;
         let _this = this;
         let post_data = [];
         this.send = function (...data) {
         try{
         let userdata = data;
         let userdata1 = JSON.parse(userdata[0]);
//         console.log(data[0]);
//         console.log(data[1]);
//       data = JSON.parse(data);
//         console.log(JSON.parse(data));
//         console.log(JSON.parse(data).type);
//         userdata1.location = 5;
//         userdata[0]=JSON.stringify(userdata1);
//         console.log(userdata);
         data = userdata ;
//       console.log(JSON.stringify(userdata));
//       data.location = 5;
//       console.log(data);
//       data = JSON.stringify(data);
         post_data = data;
           if (pageData.type == "NEW")
           {
           }
           if (pageData.type == "EDIT")
           {
           }
           if (pageData.type == "PHOTO")
           {
           }
         //提交后，保存审po记录到本地缓存
//   {"scriptTimeout":3,"endlineTime":20,"portalTime":0,"postPeriod":[30,40],"autoReview":false}
         var localreview = [];
         var tmpstorage = null ;
         var sdt = formatDate(new Date(),"yyyy-MM-dd HH:mm:ss");
         if (autoPR.privatePortal.indexOf(pageData.title)>=0 ||
            (pageData.lat>private1[0]-private1[2]/100000 & pageData.lat<private1[0]+private1[2]/100000 & pageData.lng>private1[1]-private1[3]/100000 & pageData.lng<private1[1]+private1[3]/100000) ||
               (pageData.lat>private2[0]-private2[2]/100000 & pageData.lat<private2[0]+private2[2]/100000 & pageData.lng>private2[1]-private2[3]/100000 & pageData.lng<private2[1]+private2[3]/100000) ||
               (pageData.lat>private3[0]-private3[2]/100000 & pageData.lat<private3[0]+private3[2]/100000 & pageData.lng>private3[1]-private3[3]/100000 & pageData.lng<private3[1]+private3[3]/100000) ||
               (pageData.lat>private4[0]-private4[2]/100000 & pageData.lat<private4[0]+private4[2]/100000 & pageData.lng>private4[1]-private4[3]/100000 & pageData.lng<private4[1]+private4[3]/100000) ||
               (pageData.lat>private5[0]-private5[2]/100000 & pageData.lat<private5[0]+private5[2]/100000 & pageData.lng>private5[1]-private5[3]/100000 & pageData.lng<private5[1]+private5[3]/100000)
            ){
           localreview = JSON.parse(localStorage.getItem(autoPR.username + '1'));
//           console.log(localreview);
           if(localreview === null) {localreview = [];};
//           console.log(localreview);
           tmpstorage='{\"title\":\"'+pageData.title+'\",\"type\":\"'+JSON.parse(data).type+'\",\"lat\":'+pageData.lat+',\"lng\":'+pageData.lng+
               ',\"score\":\"'+JSON.parse(data).quality+'/'+JSON.parse(data).description+'/'+JSON.parse(data).location+'/'+JSON.parse(data).cultural+'/'+JSON.parse(data).uniqueness+'/'+JSON.parse(data).safety
               +'\",\"dt\":\"'+sdt+'\"}';
//           tmpstorage='{"title":"'+pageData.title+'","type":"'+JSON.parse(data).type+'","lat":'+pageData.lat+',"lng":'+pageData.lng+
//               ',"score":"'+JSON.parse(data).quality+'/'+JSON.parse(data).description+'/'+JSON.parse(data).cultural+'/'+JSON.parse(data).uniqueness+'/'+JSON.parse(data).safety+'/'+JSON.parse(data).location
//               +'","dt":"'+sdt+'"}';
//           var tmpstorage='{"title":"'+JSON.parse(data).title+'","type":"'+JSON.parse(data).type+'","lat":'+JSON.parse(data).lat+',"lng":'+JSON.parse(data).lng+
//               ',"score":"'+JSON.parse(data).quality+'/'+JSON.parse(data).description+'/'+JSON.parse(data).cultural+'/'+JSON.parse(data).uniqueness+'/'+JSON.parse(data).safety+'/'+JSON.parse(data).location+'"}';
           localreview.push(tmpstorage);
           console.log(localreview);
           localStorage.setItem(autoPR.username + '1', JSON.stringify(localreview));
         } else {
           localreview = JSON.parse(localStorage.getItem(autoPR.username + '2'));
//           console.log(localreview);
           if(localreview === null) {localreview = [];};
//           console.log(localreview);
           tmpstorage='{\"title\":\"'+pageData.title+'\",\"type\":\"'+JSON.parse(data).type+'\",\"lat\":'+pageData.lat+',\"lng\":'+pageData.lng+
               ',\"score\":\"'+JSON.parse(data).quality+'/'+JSON.parse(data).description+'/'+JSON.parse(data).location+'/'+JSON.parse(data).cultural+'/'+JSON.parse(data).uniqueness+'/'+JSON.parse(data).safety
               +'\",\"dt\":\"'+sdt+'\"}';
//           var tmpstorage='{"title":"'+JSON.parse(data).title+'","type":"'+JSON.parse(data).type+'","lat":'+JSON.parse(data).lat+',"lng":'+JSON.parse(data).lng+
//               ',"score":"'+JSON.parse(data).quality+'/'+JSON.parse(data).description+'/'+JSON.parse(data).cultural+'/'+JSON.parse(data).uniqueness+'/'+JSON.parse(data).safety+'/'+JSON.parse(data).location+'"}';
           localreview.push(tmpstorage);
//           console.log(localreview);
           localStorage.setItem(autoPR.username + '2', JSON.stringify(localreview));
         }

//         autoPR.saveLocalUserReview();
         return send.apply(_this, data);
         } catch (e) {
           console.log(e);
           return send.apply(_this, data);
         }
      } //this.send
    }   //if (arg0='POST')

  }


  originOpen1.apply(this, arguments);
};

//节点更新监听：用于页面有刷新时的处理； 但是会处理多次
document.addEventListener('DOMNodeInserted', function() {

    if (document.URL == "https://wayfarer.nianticlabs.com/new/review") {
    }//判断是否审核页面

    //showcase-gallery
    //判断是否在展示页面(首页)
    if (document.URL == "https://wayfarer.nianticlabs.com/new/showcase") {
//    if (url === "/api/v1/vault/home") {
//       console.log(autoPR.username);
       try{
         skey = localStorage["txskey"];
         if(typeof(skey)!="undefined"){
//           if(skey.length>0){} else {
//           console.log("getItem sskey : "+skey);}
         } else {skey="";}
       } catch(e){skey="";console.log(e);}
       $(".wf-page-header__title.ng-star-inserted").replaceWith("<div class='placestr'><font size=5>"+autoPR.username+"</font></div>"+
          "<div><font size=5>skey:"+
          "<input type='text' id='sskey' name='sskey' required minlength='35' maxlength='35' size='45' value="+skey+"></input>"+
          "<button class='wf-button' onclick=autoPR.saveKey()>保存</button></font></div>");
       $(".showcase-gallery").replaceWith("<div><font size=5>池中已审</font></div><div id='privatePortal1'></div><br><div><font size=5>池外已审</font></div><div id='privatePortal2'></div>");

       var strarr ="";
       var stmparr=[];
       //在首页显示池内已审po的表格
       var prpo = [];
       prpo = JSON.parse(localStorage.getItem(autoPR.username + '1'));
//       console.log(prpo);
       var stmp = "<table style='width:100%'><thead><tr><th style='width:20%'>名称</th><th style='width:10%'>类型</th><th style='width:15%'>纬度</th><th style='width:15%'>经度</th><th style='width:20%'>打分</th><th style='width:20%'>时间</th></tr></thead>";
       if (prpo!=null){
           stmp+="<tbody>";
           for(var i=prpo.length-1;i>=0;i--){
//               console.log(prpo[i]);
               strarr = prpo[i];
               try {
               while(strarr.indexOf("undefined")>0){
                   strarr = strarr.replace("undefined","0");
               }
//               console.log(strarr);
               stmparr = eval("(" + strarr + ")");
//               console.log(JSON.parse(prpo[i]));
               stmp+="<tr><td>"+stmparr.title+"</td><td>"+stmparr.type+"</td><td>"+stmparr.lat+"</td><td>"+stmparr.lng+"</td><td>"+stmparr.score+"</td><td>"+stmparr.dt+"</td></tr>";
               } catch(e) {
                   console.log(e);
               }
           }
       stmp+="</tbody></table>";
       $("#privatePortal1").replaceWith(stmp);
     }

       //在首页显示池外已审po的表格
       prpo = JSON.parse(localStorage.getItem(autoPR.username + '2'));
//       console.log(prpo);
//       console.log(prpo[0]);
       stmp = "<table style='width:100%'><thead><tr><th style='width:20%'>名称</th><th style='width:10%'>类型</th><th style='width:15%'>纬度</th><th style='width:15%'>经度</th><th style='width:20%'>打分</th><th style='width:20%'>时间</th></tr></thead>";
       if (prpo!=null){
           stmp+="<tbody>";
//           console.log(prpo.length);
           for(i=prpo.length-1;i>=0;i--){
               strarr = prpo[i];
               try{
               while(strarr.indexOf("undefined")>0){
                   strarr = strarr.replace("undefined","0");
               }
//               console.log(strarr);
               stmparr = eval("(" + strarr + ")");
//               console.log(JSON.parse(prpo[i]));
               stmp+="<tr><td>"+stmparr.title+"</td><td>"+stmparr.type+"</td><td>"+stmparr.lat+"</td><td>"+stmparr.lng+"</td><td>"+stmparr.score+"</td><td>"+stmparr.dt+"</td></tr>";
               if (prpo.length-1 - i > autoPR.privatePortalDisplay2 ) {
                   break;
               }
               } catch (e) {
                   console.log(e);
               }
           }
       stmp+="</tbody></table>";
       $("#privatePortal2").replaceWith(stmp);
//       console.log(prpo[0].title);
       }
    }   //判断是否首页面


//    if($('.wf-page-header__description.ng-star-inserted').length > 0){
//        stmp = document.body.getInnerHTML();
//          autoPR.pagepass = stmp.substring(stmp.indexOf('host-')+5,stmp.indexOf('c121')-1);
//    }

}, false);

    // 滚动到页面顶部
function scrollToTop() {
  window.scrollBy({
      top: 0,
      behavior: 'smooth'
      });
};
    // 滚动到页面底部
function scrollToBottom() {
  window.scrollBy({
     top: document.documentElement.scrollHeight,
     behavior: 'smooth'
        });
};

window.nextRun = function (callback) {
    setTimeout(function () {
        callback;
    }, 0);
};


window.onload = function () {
    //
//    window.localStorage.clear()
    // 读取参数
    autoPR.settings = autoPR.initSettings;
    console.log(autoPR.settings);
//    localStorage.removeItem("Tong Teddy");

    if (typeof localStorage["autoCloud-settings"] != "undefined")
        autoPR.settings = JSON.parse(localStorage["autoCloud-settings"]);
    else
        localStorage.setItem(
            "autoCloud-settings",
            JSON.stringify(autoPR.settings)
        );
    autoPR.settings.autoReview= localStorage["autoReview"];
    chsaddr = null;
    setTimeout(function () {
    ~(async function () {

    //判断在展示页面
    if (document.URL == "https://wayfarer.nianticlabs.com/new/showcase") {
//    if (url === "/api/v1/vault/home") {
//       console.log(autoPR.username);
//       var sskey="";
//       sskey = JSON.parse(localstorage.getItem("txskey"));
//       $(".wf-page-header__title.ng-star-inserted").replaceWith("<div class='placestr'><font size=5>"+autoPR.username+"</font></div>"+
//          "<div><font size=5>skey:"+
//          "<input type='text' id='sskey' name='sskey' required minlength='35' maxlength='35' size='30' value="+sskey+"></input>"+
//          "<button class='wf-button' onclick=autoPR.saveKey()>保存</button></font></div>");
//       $(".showcase-gallery").replaceWith("<div><font size=5>池中已审</font></div><div id='privatePortal1'></div><br><div><font size=5>池外已审</font></div><div id='privatePortal2'></div>");
    }
    //判断在审核页面
    if(document.URL == "https://wayfarer.nianticlabs.com/new/review"){
       if(document.getElementById("useradd002")){
       }else
       {
           $(".wf-page-header__title.ng-star-inserted").after(
               '<button type="button" id="userbtn" style="background-color:#e7e7e7;color:black;display:inline-block;width:60px;height:40px" onclick = "autoPR.startstopAuto()">' +
                ' 切换 </button><font size = "3"><span style="color:red" id = "autoRev" > </span></font>'+
               '<span id="useradd001"></span><span id="useradd002">  ||    '+autoPR.username+' </span><span id="userscore"></span><span id="useradd004"></span><div id="useradd003">地址</div>');
       }
       if(autoPR.settings.autoReview==="true"){
           $("#autoRev").replaceWith('<span id="autoRev">自动</span>');
       }else{
           $("#autoRev").replaceWith('<span id="autoRev">手动</span>');
       }
       if (autoPR.privatePortal.indexOf(pageData.title)>0){
           console.log("池中Portal");
           $("#useradd004").replaceWith('<font size=3 style="color:red"><span id="useradd004">  注意：池中Portal！！！</span> </font> ');
       }else {
           console.log("池外Portal");
           $("#useradd004").replaceWith('<font size=3 style="color:red"><span id="useradd004"> </span> </font> ');
       }
//       console.log(chsaddr);
//       var addr = await autoPR.getAddr1(pageData.lat,pageData.lng);  //取qq.com的中文地址

        //先更新一次地址试试，不行就删除此段代码
        if(document.getElementById("useradd003")){
            console.log("Find useradd003");
            if(chsaddr!=null & bdisplaychsaddr==0){
               $("#useradd003").replaceWith('<font size=3 style="color:black"><div id="useradd003">地址：'+chsaddr+' ; 纬度：'+pageData.lat+';经度：'+pageData.lng+'</div></font> ');
               console.log("Replace Chinese adderss!");
            }else
            {
               $("#useradd003").replaceWith('<font size=3 style="color:black"><div id="useradd003">地址：'+engaddr+' ; 纬度：'+pageData.lat+';经度：'+pageData.lng+'</div></font>');
               console.log("Replace English adderss! 1");
            }
        }else
        {
            console.log("Can not Find useradd003");
        }
               console.log("window.load:");

    }
    // 判断是否在settings页面
    if (document.URL == "https://https://wayfarer.nianticlabs.com/new/captcha") {
        const chk = document.querySelectorAll('recaptcha-checkbox-checkmark div[role="presentation"]')[0];
            if (chk) {
                chk.click();
    }
    }
    // 判断是否在settings页面
    if (document.URL == "https://wayfarer.nianticlabs.com/new/settings") {
        $(".max-w-md.ng-star-inserted").prepend(
            '<div class="settings__item settings-item"><div class="settings-item__header"><div>autoPR设置</div> ' +
            '<div><app-edit-setting-button _nghost-hyr-c179="" onclick="autoPR.saveSettings()"> ' +
            '<button _ngcontent-hyr-c179="" wf-button="" wftype="icon" class="wf-button wf-button--icon"> ' +
            '<mat-icon _ngcontent-hyr-c179="" role="img" class="mat-icon notranslate material-icons mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font">edit</mat-icon></button></app-edit-setting-button> ' +
            '</div></div><div class="settings-item__value" id="autoCloudSettings">'+ JSON.stringify(autoPR.settings) +
            '</div></div>'
        );
        $("#autoCloudSettings").val(autoPR.settings);
        console.log($("#autoCloudSettings"));
        console.log("处于settings页面");
        return;
    }
//       nextRun(replaceSomething);

      //增加标签：id:useradd001
      const vper = (autoPR.initSettings.postPeriod[0] + ((autoPR.initSettings.postPeriod[1] - autoPR.initSettings.postPeriod[0]) * Math.random() ) );


        // 计时器
       var reviewTimer = setInterval(function () {
//           console.log("timer");
         // 保存审当前po的起始时间
       if (document.URL == "https://wayfarer.nianticlabs.com/new/review") {
         autoPR.saveStartTime();

         //判断为池中Edit，则暂停
           if (pageData.type == "EDIT")
           {
               scrollToBottom();
               scrollToTop();
               if (autoPR.privatePortal.indexOf(pageData.title)>=0 ||
                   (pageData.lat>private1[0]-private1[2]/100000 & pageData.lat<private1[0]+private1[2]/100000 & pageData.lng>private1[1]-private1[3]/100000 & pageData.lng<private1[1]+private1[3]/100000) ||
                   (pageData.lat>private2[0]-private2[2]/100000 & pageData.lat<private2[0]+private2[2]/100000 & pageData.lng>private2[1]-private2[3]/100000 & pageData.lng<private2[1]+private2[3]/100000) ||
                   (pageData.lat>private3[0]-private3[2]/100000 & pageData.lat<private3[0]+private3[2]/100000 & pageData.lng>private3[1]-private3[3]/100000 & pageData.lng<private3[1]+private3[3]/100000) ||
                   (pageData.lat>private4[0]-private4[2]/100000 & pageData.lat<private4[0]+private4[2]/100000 & pageData.lng>private4[1]-private4[3]/100000 & pageData.lng<private4[1]+private4[3]/100000) ||
                   (pageData.lat>private5[0]-private5[2]/100000 & pageData.lat<private5[0]+private5[2]/100000 & pageData.lng>private5[1]-private5[3]/100000 & pageData.lng<private5[1]+private5[3]/100000)
            ){
               autoPR.settings.autoReview="false";
               }
           }
         //图片编辑，时间范围减半
         autoPR.initSettings.portalTime = (new Date().valueOf() - parseInt(localStorage["portalTime"])) /500; // 半秒
//             console.log("提交前："+autoPR.initSettings.portalTime +" : "+ vper*2 +" : "+autoPR.settings.autoReview);
//           console.log(autoPR.settings.autoReview);
         if(autoPR.initSettings.portalTime>=2 & iHaveRate=="false"){
            autoPR.UserSubmit();    //自动打分，此处未提交
         }
         let apperr = document.querySelector('app-review-error');
         //如果超过5秒，提交按钮未选中，则出现地图点无法选中的bug，此处再次点击地图
         if(autoPR.initSettings.portalTime>5){
             let btn1 = document.querySelector('button[class="wf-button wf-split-button__main wf-button--primary"]');
//             console.log(btn1);
             if (btn1==null) autoPR.UserEditBugTemp();
         }
         if((autoPR.initSettings.portalTime>=autoPR.initSettings.itimeout & autoPR.settings.autoReview=="true" & pageData.captcha=="false"
                   & pageData.code!="EXHAUSTED" ) || apperr){  //超时了
             window.location.reload();
         }

       //首页显示最近审过的5个池内po
       let retitle = document.getElementById("latestpo");
       if( !retitle){
           $(".wf-page-header__title.ng-star-inserted").replaceWith("<font size=3><div class='wf-page-header__title ng-star-inserted' id='latestpo'>最近审的po</div></font>");
           let prpo1 = JSON.parse(localStorage.getItem(autoPR.username + '1'));
           console.log(prpo1);
           //       console.log(prpo[0]);
           if (prpo1!=null){
               let stmp =" ";
               //           console.log(prpo.length);
               for(let i=prpo1.length-1;i>=prpo1.length-6;i--){
                   let strarr = prpo1[i];
                   try {
                       while(strarr.indexOf("undefined")>0){
                           strarr = strarr.replace("undefined","0");
                       }
                       //               console.log(strarr);
                       let stmparr = eval("(" + strarr + ")");
                       stmp += stmparr.title+"/";
                   } catch(e) {
                       console.log(e);
                   }
               }
               console.log(stmp);
               $("#latestpo").replaceWith("<font size=3><div class='wf-page-header__title ng-star-inserted' id='latestpo'>最近审的po："+stmp+"</div></font>");
           }
       }


         if (autoPR.initSettings.portalTime >= vper*2 & autoPR.settings.autoReview == 'true' & iSubmit=="false" )
         {
            let btn = document.querySelector('button[class="wf-button wf-split-button__main wf-button--primary"]');

            if (btn){
                iSubmit="true";
                btn.click();
            console.log("Submit!");
//             console.log("提交："+autoPR.initSettings.portalTime +" : "+ vper*2 +" : "+autoPR.settings.autoReview);
//                clearInterval(reviewTimer);
            }
         }

           if(new Date().getSeconds()==0){
//               console.log("chsaddr:"+chsaddr+"|lastchsaddr:"+lastchsaddr+"|engaddr:"+engaddr+"|lastengaddr:"+lastengaddr);
           }
       if(document.getElementById("useradd001")){
       }else
       {
         $(".wf-page-header__title.ng-star-inserted").after(
               '<button type="button" id="userbtn" style="background-color:#e7e7e7;color:black;display:inline-block;width:60px;height:40px" onclick = "autoPR.startstopAuto()">' +
                ' 切换 </button><font size = "3"> <span style="color:red" id = "autoRev" > </span></font>'+
             '<span id="useradd001"></span><font size=3 style="color:black"><span id="useradd002">   ||    '+autoPR.username+' </span><span id="userscore">'+sspos+'</span><span id="useradd004"></span></font><font size=3 style="color:black"><div id="useradd003"></div></font>');
       }
       if(autoPR.settings.autoReview==="true"){
           $("#autoRev").replaceWith('<span id="autoRev">自动</span>');
       }else{
           $("#autoRev").replaceWith('<span id="autoRev">手动</span>');
       }
       $("#useradd001").replaceWith(
                '<span style="color:red" id = "useradd001" > <font size = "3">' + "&nbsp;&nbsp;&nbsp;&nbsp;" +
                     (    Array(2).join("0") +  Math.floor(autoPR.initSettings.portalTime / 120) ).slice(-2) + ":" +
                     (    Array(2).join("0") + (Math.floor(autoPR.initSettings.portalTime / 2) % 60) ).slice(-2)  + "</font> </span>");
       };
       if(typeof(autoPR.username)!="undefined") {  $("#useradd002").innerText= "   ||   " + autoPR.username ;  }

       if(typeof(pageData)!="undefined"){
            if(chsaddr == null)
            {
//                console.log("lastchsaddr : "+lastchsaddr);
            }
           if(chsaddr!=null){
//               console.log("chsaddr : "+autoPR.chsaddr);
//               console.log("lastchsaddr : "+autoPR.lastchsaddr);
           if(chsaddr!=lastchsaddr || (typeof lastchsaddr =="undefined" & chsaddr!=null & typeof chsaddr!="undefined"))
           {
               if(  bdisplaychsaddr==0){
//               console.log("需要更新");
//               console.log(chsaddr);
//               console.log(lastchsaddr);
               $("#useradd003").replaceWith('<div id="useradd003">地址：'+chsaddr+' ; 纬度：'+pageData.lat+';经度：'+pageData.lng+'</div>');
//               $("#useradd003").innerText ='地址：'+chsaddr+' ; 纬度：'+pageData.lat+';经度：'+pageData.lng;
//               console.log("Timer : update useradd003 Chinese address!");
               lastchsaddr = chsaddr;
               lastengaddr = engaddr;
//               console.log("lastchsaddr:"+lastchsaddr);
            }
           }
           }  //更新中文地址
           else{
               if(engaddr!=null){
               if(engaddr!=lastengaddr)
               {
                   if(bdisplaychsaddr==0){
                       autoPR.getAddr1(pageData.lat,pageData.lng);
                   }
//                   console.log(engaddr);
                   $("#useradd003").replaceWith('<div id="useradd003">地址：'+engaddr+' ; 纬度：'+pageData.lat+';经度：'+pageData.lng+'</div>');
//                   $("#useradd003").innerText ='地址：'+engaddr+' ; 纬度：'+pageData.lat+';经度：'+pageData.lng;
//                   console.log("Timer : update useradd003 English address!");
                   lastengaddr = engaddr;
                }
                }  //更新英文地址
           }
       }  //如果pageData存在


       }, 500);
      })();
    },
    autoPR.initSettings.scriptTimeout * 1000) ;
};
//window.onload
