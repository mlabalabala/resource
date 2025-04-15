// ==UserScript==
// @name         Auto Play Video
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Automatically resume video playback when it is paused, using MutationObserver to monitor DOM changes
// @author       Your Name
// @match        https://study.jamg.cn/courseStudyAction/toCourseStudyNew.action
// @require      https://study.jamg.cn/js/study.js?v=11
// @require      https://study.jamg.cn/js/dateUtil.js
// @require      https://study.jamg.cn/js/layer/layer.js
// @require      https://study.jamg.cn/js/aes.js?v=11
// @downloadURL  https://raw.bunnyxyz.eu.org/https://github.com/mlabalabala/resource/blob/main/js/anpeijmfuckvideo.js
// @updateURL    https://raw.bunnyxyz.eu.org/https://github.com/mlabalabala/resource/blob/main/js/anpeijmfuckvideo.js
// ==/UserScript==

(function () {
    "use strict";
    console.log("Auto Play Video ...");

    // 创建调试窗口
    const debugBox = document.createElement('div');
    debugBox.id = 'debug-window';
    debugBox.style.position = 'fixed';
    debugBox.style.top = '10px';
    debugBox.style.right = '10px';
    debugBox.style.zIndex = '99999';
    debugBox.style.width = '300px';
    debugBox.style.height = '200px';
    debugBox.style.overflowY = 'auto';
    debugBox.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    debugBox.style.color = 'lime';
    debugBox.style.fontSize = '12px';
    debugBox.style.padding = '10px';
    debugBox.style.border = '1px solid #444';
    debugBox.style.borderRadius = '8px';
    debugBox.style.boxShadow = '0 0 10px #000';
    debugBox.style.cursor = 'move';

    // 可拖动实现
    let isDragging = false;
    let offsetX, offsetY;

    debugBox.addEventListener('mousedown', function(e) {
        isDragging = true;
        offsetX = e.clientX - debugBox.offsetLeft;
        offsetY = e.clientY - debugBox.offsetTop;
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (isDragging) {
            debugBox.style.left = (e.clientX - offsetX) + 'px';
            debugBox.style.top = (e.clientY - offsetY) + 'px';
            debugBox.style.right = 'auto'; // 防止冲突
        }
    });

    document.addEventListener('mouseup', function() {
        isDragging = false;
    });
    document.body.appendChild(debugBox);
    window.debugLog = function(msg) {
        const line = document.createElement('div');
        line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        debugBox.appendChild(line);
        debugBox.scrollTop = debugBox.scrollHeight; // 滚到底部
    };

    let currentTime = 0;

    const init = setInterval(() => {
        if (player) {
            currentTime += 60 * 2;
            if (player.getDuration() < currentTime) {
                clearInterval(init);
                currentTime = player.getDuration();
                debugLog("最后一轮！");
            }
            submitLearnTime();
        }

    }, 1000);

    function formatSecondsToHHMMSS(seconds) {
        seconds = parseInt(seconds, 10);
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        } else {
            return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
    }



    function submitLearnTime() {

        var wareRecordId = null;//课件学习记录id
        var courseRecordId = null;//课程学习记录id
        //查询出该课件的学习记录
        $.ajax({
            type: 'POST',
            async: false,//此处为同步
            data: {
                "sectionId": sectionId, "courseWareId": courseWareId, "userId": userId,
                "source": source, "relationId": relationId, "courseId": courseId
            },
            url: '/courseStudyAction/getCourseWareByConditions.action',
            success: function (data) {
                if (data != null && data != '') {
                    wareRecordId = data.id;
                    courseRecordId = data.recordId;
                }
            }
        });
        if (courseWareType == 3) {
            //视频课件
            var vedioParam = {};
            vedioParam.wareRecordId = wareRecordId;
            vedioParam.courseRecordId = courseRecordId;
            vedioParam.courseId = courseId;
            vedioParam.userId = userId;
            vedioParam.totalTime = player.getDuration();
            vedioParam.currentTime = currentTime;
            vedioParam.source = source;
            vedioParam.relationId = relationId;
            vedioParam.courseWareId = courseWareId;
            $.ajax({
                type: 'POST',
                async: false,//此处为同步
                data: {param:study(JSON.stringify(vedioParam))},
                url: '/courseStudyAction/recordVedioWareAfterLeavePageEncipher.action',
                success: function (data) {
                    if (data.rtnResult == 'FAIL') {
                        debugLog("保存swf课件进度错误");return;
                    }
                    if (data.rtnResult == 'RESTRICTED') {
                        debugLog("该视频已被挤掉，未完成的视频不能同时观看，学习进度未保存");return;
                    }
                    if (data.rtnResult == 'ILLEGALITY') {
                        debugLog("请勿非法提交学习进度");return;
                    }
                    debugLog("总时长: " + formatSecondsToHHMMSS(player.getDuration()) + ", 已完成: " + formatSecondsToHHMMSS(currentTime));
                }
            });
        }
    }
})();


/*
let uid = userId;
let source = 2;
let backFlag = 3;
let relationName = '';
let categoryId = '';
let categoryType = '';

let unfinishedCourseParamList = null;

let currentUrl = document.location.href;
if (-1 !== currentUrl.indexOf("/courseStudyAction/toCourseStudyNew.action")) {
    const init = setInterval(() => {
        let video = document.querySelector('video');
        if (video && typeof pauseVideo !== 'undefined' && typeof clear !== 'undefined' && player && timer) {
            console.log("ready!");
            // clearInterval(init);
            pauseVideo = function() {return;};
            // video.playbackRate = 2.0;
            video.muted = true;
            video.addEventListener('ended', () => { console.log('video ended.'); });
            clear();
            currentTime = player.getDuration();
        }
    }, 500);
    (function () { console.log("recordCourseWare!"); setInterval("recordCourseWare()", 5 * 1000); })();
} else if (-1 !== currentUrl.indexOf("/index/toIndexPage.action?fuckuman")) {
    updateGMCourseParamList();
    startAutoPlay();
}

function updateGMCourseParamList() {
    unfinishedCourseParamList = [];
    initLearnPlanForPics();
    console.log(unfinishedCourseParamList);
    GM_setValue("unfinishedVideoList_"+uid, JSON.stringify(unfinishedCourseParamList));
}

function startAutoPlay() {
    let videoParamList = JSON.parse(GM_getValue("unfinishedVideoList_"+uid, "[]"));
    console.log(videoParamList);
    postJump("/courseStudyAction/toCourseStudyNew.action", videoParamList.pop());
}

function initLearnPlanForPics() {
    let param = {};
    param.status = 1;
    param.name = "";
    param.page = 0;
    param.pageSize = 15;
    
    $.ajax({
        type: 'POST',
        async: false,
        data: param,
        url: '/studentLearnPlanAction/getLearnPlansForPics.action',
        success: function (data) {
            console.log(JSON.stringify(data));
            let l = data.map(e => e.id);
            l.forEach(learnPlanId => {
                initLearnPlanDetails(uid, learnPlanId);
            });
        }
    });
}

function initLearnPlanDetails(userId, learnPlanId){
    //查询参数
    var param = new Object();
    param.learnPlanId = learnPlanId;
    param.userId = userId;
    
    $.ajax({
        type:'POST',
        async:false,
        data:param,
        url:'/studentLearnPlanAction/getLearnPlanStages.action',
        success:function(data){
            console.log(JSON.stringify(data));
            // [{"id":10468,"name":"1111","process":40}] id为relationId
            if(data != null && data != ''){
                var stages = data;
                for(var i = 0; i < stages.length; i++){
                    var stage = stages[i];
                    let stageId = stage.id;

                    //根据该学习计划阶段查询所有课程
                    var innerParam = new Object();
                    innerParam.learnPlanStageId = stageId;
                    innerParam.userId = userId;
                    $.ajax({
                        type:'POST',
                        async:false,//同步，必须先查出来
                        data:innerParam,
                        url:'/studentLearnPlanAction/getLearnPlanStageCourses.action',
                        success:function(data){
                            console.log(JSON.stringify(data));
                            let l = data.map(e => e.id);
                            l.forEach(courseId => {
                                initCourseIdList(courseId, uid, stageId);
                            });
                        }
                    });
                }				
            }
        }
    });
}

function initCourseIdList(courseId, userId, relationId) {
    var param = new Object();
    param.courseId = courseId;
    $.ajax({
        type:'POST',
        async:false,//同步
        data:param,
        url:'/courseDetailAction/getCourseSections.action',
        success:function(data){
            if(data != null && data != ''){
                var sections = data;
                for(var i = 0; i < sections.length; i++){
                    var section = sections[i];
                    let sectionId = section.id
                    
                    //根据章节id获取所有课件及课件的学习进度
                    var innerParam = new Object();
                    innerParam.sectionId = sectionId;
                    innerParam.userId = userId;
                    innerParam.source = source;
                    innerParam.relationId = relationId;
                    innerParam.courseId = courseId;
                    $.ajax({
                        type:'POST',
                        async:false,
                        data:innerParam,
                        url:'/courseDetailAction/getSectionWares.action',
                        success:function(data){
                            console.log(JSON.stringify(data));
                            data.forEach(e => {
                                let courseWareType = parseInt(e.type);
                                let progressPercent = parseInt(e.progressPercent);
                                if (courseWareType === 3 && progressPercent < 100) {
                                    let courseWareId = e.id;
                                    let currentContent = e.currentContent;
                                    var param = {
                                        'courseWareId':courseWareId,
                                        'courseWareType':courseWareType,
                                        'courseId':courseId,
                                        'sectionId':sectionId,
                                        'currentContent':currentContent,
                                        'progressPercent':progressPercent,
                                        'source':source,
                                        'relationId':relationId,
                                        'relationName':relationName,
                                        'categoryId':categoryId,
                                        'categoryType':categoryType,
                                        'backFlag':backFlag
                                    }
                                    console.log(param);
                                    unfinishedCourseParamList.push(param);
                                    // postJump("/courseStudyAction/toCourseStudyNew.action", param);
                                }
                            });
                        }
                    });
                }
            }
        }
    });
}

function postJump(URL, PARAMS) { 
    var temp = document.createElement("form"); 
    temp.action = URL; 
    temp.method = "POST"; 
    temp.style.display = "none"; 
    for (var x in PARAMS) { 
      var opt = document.createElement("textarea"); 
      opt.name = x; 
      opt.value = PARAMS[x];
      temp.appendChild(opt); 
     } 
    document.body.appendChild(temp); 
    temp.submit(); return temp; 
}
*/



/*
    //自动跳转学习计划
    elmGetter.get('a[title="学习计划"]').then(learnPlanBtn => {
        learnPlanBtn.click();
    });
    elmGetter.get('#courseChapters',5000).then(chapters => {
        if (chapters) {
            handleNextVideo(chapters.querySelectorAll('h4'));
        }
    });
    // 定义函数来处理下一个视频的逻辑
    function handleNextVideo(videoList) {
        if (videoList) {
            let finishedVideoNum = 0;
            let total = videoList.length;
            for (let i=0; i<total; i++) {
                let videoEle = videoList[i];
                let learnProcessEle = videoEle.querySelector("b");
                let continueLearnEle = videoEle.querySelector("a");
                if (learnProcessEle && continueLearnEle) {
                    if ("100%" !== learnProcessEle.textContent) {
                        continueLearnEle.click();
                    }
                    else finishedVideoNum++;
                }
            }
            console.log('已完成数量：' + finishedVideoNum);
            console.log('总数数量：' + total);
            if (finishedVideoNum === total && backBtn) {
                // if (!courseIsFinishedList.includes(title)){
                //     courseIsFinishedList.push(title);
                // }
                // GM_setValue('courseIsFinishedList', courseIsFinishedList);
                backBtn.click();
            }
        }
    }

*/
