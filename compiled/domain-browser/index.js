(function(){"use strict";var r={361:function(r){r.exports=require("events")},821:function(r,e,t){r.exports=function(){var r=t(361);var e={};e.createDomain=e.create=function(){var e=new r.EventEmitter;function emitError(r){e.emit("error",r)}e.add=function(r){r.on("error",emitError)};e.remove=function(r){r.removeListener("error",emitError)};e.bind=function(r){return function(){var e=Array.prototype.slice.call(arguments);try{r.apply(null,e)}catch(r){emitError(r)}}};e.intercept=function(r){return function(e){if(e){emitError(e)}else{var t=Array.prototype.slice.call(arguments,1);try{r.apply(null,t)}catch(e){emitError(e)}}}};e.run=function(r){try{r()}catch(r){emitError(r)}return this};e.dispose=function(){this.removeAllListeners();return this};e.enter=e.exit=function(){return this};return e};return e}.call(this)}};var e={};function __nccwpck_require__(t){var n=e[t];if(n!==undefined){return n.exports}var i=e[t]={exports:{}};var o=true;try{r[t].call(i.exports,i,i.exports,__nccwpck_require__);o=false}finally{if(o)delete e[t]}return i.exports}if(typeof __nccwpck_require__!=="undefined")__nccwpck_require__.ab=__dirname+"/";var t=__nccwpck_require__(821);module.exports=t})();