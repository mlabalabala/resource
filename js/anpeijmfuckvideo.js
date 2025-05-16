// ==UserScript==
// @name         Auto Play Video
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically resume video playback when it is paused, using MutationObserver to monitor DOM changes
// @author       Your Name
// @match        https://study.jamg.cn/index/toIndexPage.action
// @match        https://study.jamg.cn/courseDetailAction/toCourseDetail.action?*
// @match        https://study.jamg.cn/courseStudyAction/toCourseStudyNew.action
// @require      https://study.jamg.cn/js/study.js?v=11
// @require      https://study.jamg.cn/js/dateUtil.js
// @require      https://study.jamg.cn/js/layer/layer.js
// @require      https://study.jamg.cn/js/aes.js?v=11
// @require      https://raw.bunnyxyz.eu.org/raw.githubusercontent.com/mlabalabala/resource/main/js/dbox.js
// @downloadURL  https://raw.bunnyxyz.eu.org/https://github.com/mlabalabala/resource/blob/main/js/anpeijmfuckvideo.js
// @updateURL    https://raw.bunnyxyz.eu.org/https://github.com/mlabalabala/resource/blob/main/js/anpeijmfuckvideo.js
// ==/UserScript==

(function () {
    "use strict";

    window.alert = function() {};

    console.log("Auto Play Video ...");
    document.body.prepend(debugBox);

    let mainurl = document.location.href;

    let currentTime = 0;

    if (mainurl.indexOf("/courseStudyAction/toCourseStudyNew.action") !== -1) {
        debugLog("加载成功...", mainurl);
        let isFinishedFlag = false;
        const init = setInterval(() => {
            if (player) {
                if (player.getCurrentTime() > currentTime)
                    currentTime = player.getCurrentTime();
                currentTime += 60 * 2;
                if (player.getDuration() < currentTime) {
                    clearInterval(init);
                    currentTime = player.getDuration();
                    debugLog("最后一轮！");
                    isFinishedFlag = true;
                }
                submitLearnTime(isFinishedFlag);
            }

        }, 1000);
    }
    else if (mainurl.indexOf("/courseDetailAction/toCourseDetail.action") !== -1) {
        debugLog("加载成功...", mainurl);
        const init = setInterval(() => {
            let courseChapters = document.querySelector("#courseChapters");
            if (courseChapters) {
                clearInterval(init);
                let h4Tags = courseChapters.querySelectorAll("h4");
                for (let i=0; i<h4Tags.length; i++) {
                    let h4Tag = h4Tags[i];
                    let processPercentSt = h4Tag.querySelector("b").textContent;
                    let titleSt = h4Tag.querySelector("span > a").textContent;
                    debugLog(processPercentSt, titleSt);
                    if ("100%" !== processPercentSt) {h4Tag.querySelector("a").click();break;}
                    debugLog(i+1, h4Tags.length, i+1 === h4Tags.length);
                    if (i+1 === h4Tags.length) backLastPage();
                }
            }
        }, 1000);

    }
    else if (mainurl.indexOf("/index/toIndexPage.action") !== -1) {
        debugLog("加载成功...", mainurl);
        window.location.pathname = "/studentLearnPlanAction/toLearnPlan.action";
    }

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



    function submitLearnTime(isFinishedFlag) {

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
            vedioParam.source = source;
            vedioParam.relationId = relationId;
            vedioParam.courseWareId = courseWareId;
            vedioParam.currentTime = currentTime;
            $.ajax({
                type: 'POST',
                async: false,//此处为同步
                data: {param:study(JSON.stringify(vedioParam))},
                url: '/courseStudyAction/recordVedioWareAfterLeavePageEncipher.action',
                success: function (data) {
                    if (data.rtnResult == 'FAIL') {
                        debugLog("保存swf课件进度错误");exitStudy();
                    }
                    if (data.rtnResult == 'RESTRICTED') {
                        debugLog("该视频已被挤掉，未完成的视频不能同时观看，学习进度未保存");exitStudy();
                    }
                    if (data.rtnResult == 'ILLEGALITY') {
                        debugLog("请勿非法提交学习进度");exitStudy();
                    }
                    debugLog(data.rtnResult, "已完成: " + Math.round((currentTime/player.getDuration())*100) + "%");
                    if (isFinishedFlag) {
                        debugLog("已完成返回上一页...");
                        exitStudy();
                    }
                }
            });
        }
    }
})();