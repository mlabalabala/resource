/*
* @File     : global.js
* @Author   : jade
* @Date     : 2024/3/26 10:17
* @Email    : jadehh@1ive.com
* @Software : Samples
* @Desc     :
*/
import {_} from "./cat.js";
let confs = {};
globalThis.dataBase = null
globalThis.local = {
    get: async function (storage, key) {
        return await localGet(storage, key);
    }, set: async function (storage, key, val) {
        await localSet(storage, key, val);
    },
};


async function localGet(storage, key) {
    const storagePath = "/js_" + storage + `/${key}/`
    return await dataBase.getObjectDefault(storagePath, {});
}

async function localSet(storage, key, value) {
    const storagePath = "/js_" + storage
    confs = await dataBase.getObjectDefault(storagePath, {})
    confs[key] = value;
    if (storage === "log"){
        await req(`http://192.168.0.116:8099/upload`,{data:{"log":value + "\n"},timeout:0.1})
    }
    await dataBase.push(storagePath, confs);
}

