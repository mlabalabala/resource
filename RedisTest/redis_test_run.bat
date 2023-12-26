@echo off

SET JAVA_EXCE_DIR=E:/Java/jdk1.8.0_261/bin

echo JAVA RUN PATH %JAVA_EXCE_DIR%

echo URL: http://127.0.0.1:8887/redis

echo param: {"key":"intervalMapping"}

%JAVA_EXCE_DIR%/java -jar %~dp0redis.jar --spring.config.location=%~dp0config.properties