// ==UserScript==
// @name         Auto Play Video
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically resume video playback when it is paused, using MutationObserver to monitor DOM changes
// @author       Your Name
// @match        http://124.164.238.151:28808/*
// @match        https://study.jamg.cn/index/toIndexPage.action?fuckuman
// @match        https://study.jamg.cn/courseStudyAction/toCourseStudyNew.action
// @grant        GM_setValue
// @grant        GM_getValue
// @require      https://scriptcat.org/lib/513/2.0.0/ElementGetter.js
// ==/UserScript==

(function () {
    // https://cdn.bootcss.com/jquery/3.4.1/jquery.min.js
    // https://scriptcat.org/lib/513/2.0.0/ElementGetter.js
    "use strict";
    console.log("Auto Play Video ...");

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

    /**
    * 初始化学习计划（图片展现）
    */
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

    /**
     * 初始化学习计划详情
     */
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

})();
