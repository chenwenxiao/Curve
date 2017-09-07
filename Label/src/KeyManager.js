/**
 * Created by shiro on 17-2-14.
 */

let keyManager = {
  currentKey: null,
  keyMap: {
    'a': 65,
    'd': 68,
    's': 83,
    'w': 87,
    'z': 90,
    'spacebar': 32
  },
  eventMap: {
  },
  init() {
    window.onload = function () {
      document.onkeydown = function (e) {
        e = e ? e : window.event;
        let currKey = e.keyCode || e.which || e.charCode;
        //alert(currKey);
        keyManager.currentKey = currKey;
        if (keyManager.eventMap[currKey])
          keyManager.eventMap[currKey]();
      };
      document.onkeyup = function(e) {
        e = e ? e : window.event;
        let currKey = e.keyCode || e.which || e.charCode;
        //alert(currKey);
        if (currKey == keyManager.currentKey)
          keyManager.currentKey = null;
      }
    }
  },
  checkCode(key) {
    return keyManager.keyMap[key] == keyManager.currentKey;
  },
  bindEvent(key, callback) {
    keyManager.eventMap[keyManager.keyMap[key]] = callback;
  }
};

module.exports = keyManager;