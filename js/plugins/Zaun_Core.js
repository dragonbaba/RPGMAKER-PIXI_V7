/*:
 * @target MZ
 * @author Zaun
 * @plugindesc Zaun插件核心 ver 1.10
 * @help
 * 该插件作为免费插件，以供我的插件和其他插件使用
 * 默认情况下不提供任何运行的功能
 * 
 * 2024.3.19 初版完成 1.00
 * 2024.5.2 版本变化 1.00 -> 1.10
 * 加载器移除
 * 理由，常规的rm不需要额外的加载器进行控制
 * 同时也是为了更快的加载，异步的数量不做限制
 * 
 * */
"use strict";
globalThis.Zaun = Object.create(null);
Function.create = arg => () => arg;
Function.empty = () => null;
Zaun.Core = (Core => {
  const ParseSystem = (parse => {
    function sampleClone(obj) {
      const desc = Object.getOwnPropertyDescriptors(obj);
      return Object.create(null, desc);
    }
    function isObject(obj) {
      if (!obj) return false;
      if (Array.isArray(obj)) return false;
      if (typeof obj === "string") {
        if (!isNaN(Number(obj))) obj = Number(obj);
        return false;
      }
      return typeof obj === "object";
    }
    function isBoolean(obj) {
      return (obj === "true") || (obj === "false");
    }
    function readParam({ obj, targetObj, key }) {
      if (Array.isArray(obj)) {
        const length = obj.length;
        for (let i = 0; i < length; i++) {
          obj[i] = parseObj(obj[i]);
          readParam({ obj: obj[i], targetObj: obj, key: i });
        }
      } else if (isObject(obj)) {
        for (const key of Reflect.ownKeys(obj)) {
          obj[key] = parseObj(obj[key]);
          readParam({ obj: obj[key], targetObj: obj, key });
        }
      } else if (typeof obj === "string") {
        if (!isNaN(Number(obj))) {
          targetObj[key] = Number(obj);
        }
      }
    }
    function parseObj(obj) {
      if (typeof obj !== "string") return obj;
      let parseObj = obj;
      try {
        parseObj = JSON.parse(obj);
      } catch (_e) {
        return parseObj;
      }
      if (!isObject(parseObj)) {
        if (isBoolean(obj)) return obj === "true";
        return parseObj;
      }
      Reflect.setPrototypeOf(parseObj, null);
      return parseObj;
    }
    function toParse(obj) {
      if (isObject(obj)) obj = sampleClone(obj);
      if (typeof obj === "string") obj = parse(obj);
      readParam({ obj });
      return obj;
    }
    parse.toParse = toParse;
    Object.freeze(parse);
    return parse;
  })(Object.create(null));
  Core.ParseSystem = ParseSystem;
  Core.VERSION = "1.10";
  return Core;
})(Object.create(null));