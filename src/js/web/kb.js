import * as Video from "./video.js"
import * as Cartridge from "../prosystem/Cartridge.js"
import * as KeysModule from "./keys.js"
import * as Events from "../events.js"

var Keys = KeysModule.Keys;

var KeyboardMapping = function (leftKey, rightKey, upKey, downKey, b1Key, b2Key) {
  var leftKey = leftKey;
  var rightKey = rightKey;
  var upKey = upKey;
  var downKey = downKey;
  var b1Key = b1Key;
  var b2Key = b2Key;

  var leftHeld = false;
  var rightHeld = false;
  var upHeld = false;
  var downHeld = false;
  var b1Held = false;
  var b2Held = false;

  var leftLast = false;
  var upLast = false;

  return {
    getLeft() { return leftKey; },
    setLeft(c) { leftKey = c; },
    getRight() { return rightKey; },
    setRight(c) { rightKey = c; },
    getUp() { return upKey; },
    setUp(c) { upKey = c; },
    getDown() { return downKey; },
    setDown(c) { downKey = c; },
    getButton1() { return b1Key; },
    setButton1(c) { b1Key = c; },
    getButton2() { return b2Key; },
    setButton2(c) { b2Key = c; },
    isLeft: function () {
      return (leftHeld && !(rightHeld && !leftLast));
    },
    isRight: function () {
      return (rightHeld && !(leftHeld && leftLast));
    },
    isUp: function () {
      return (upHeld && !(downHeld && !upLast));
    },
    isDown: function () {
      return (downHeld && !(upHeld && upLast));
    },
    isButton1: function () { return b1Held; },
    isButton2: function () { return b2Held; },
    handleKeyCode: function (code, down) {
      switch (code) {
        case leftKey:
          leftHeld = down;
          if (down) leftLast = true;
          return true;
        case upKey:
          upHeld = down;
          if (down) upLast = true;
          return true;
        case rightKey:
          rightHeld = down;
          if (down) leftLast = false;
          return true;
        case downKey:
          downHeld = down;
          if (down) upLast = false;
          return true;
        case b1Key:
          b1Held = down;
          return true;
        case b2Key:
          b2Held = down;
          return true;
      }
      return false;
    },
    reset: function () {
      leftLast = false;
      upLast = false;
    }
  }
}

var p1KeyMap = new KeyboardMapping(
  37, // Left arrow
  39, // Right arrow
  38, // Up arrow
  40, // Down arrow
  90, // Z key
  88  // X key
);

var p2KeyMap = new KeyboardMapping(
  74, // J key
  76, // L key
  73, // I key
  75, // K key
  78, // N key
  77  // M key
);

var resetHeld = false;
var selectHeld = false;
var pauseHeld = false;

var leftDiffSet = false;
var rightDiffSet = false;

/** Cartridge shadow */
var cartridgeLeftSwitch = 1;
var cartridgeRightSwitch = 0;

var f1Code = 112; // F1
var f2Code = 113; // F2
var f3Code = 114; // F3
var f4Code = 115; // F4
var f5Code = 116; // F5
var f6Code = 117; // F6
var f9Code = 120; // F9
var f11Code = 122; // F11

function setLeftDiffSet(val) {
  leftDiffSet = val;
  Events.fireEvent("onLeftDiffChanged", val);
}

function setRightDiffSet(val) {
  rightDiffSet = val;
  Events.fireEvent("onRightDiffChanged", val);
}

function keyEvent(event, down) {
  var code = event.keyCode;
  var handled = (p1KeyMap.handleKeyCode(code, down) ||
    p2KeyMap.handleKeyCode(code, down));

  if (!handled) {
    switch (code) {
      case f2Code:
        resetHeld = down;
        handled = true;
        break;
      case f3Code:
        selectHeld = down;
        handled = true;
        break;
      case f4Code:
        pauseHeld = down;
        handled = true;
        break;
      case f5Code:
        if (!down) {
          setLeftDiffSet(leftDiffSet ^= 1);
        }
        handled = true;
        break;
      case f6Code:
        if (!down) {
          setRightDiffSet(rightDiffSet ^= 1);
        }
        handled = true;
        break;
      case f1Code:
        // Ignore F1 keys, annoying to have browser open tab
        handled = true;
        break;
      case f9Code:
      case f11Code:
        if (down) {
          Video.fullScreen();
        }
        handled = true;
        break;
    }
  }

  if (handled && event.preventDefault) {
    event.preventDefault();
  }
}

function init() {
  document.onkeydown =
    function (event) {
      keyEvent(event, true);
    };

  document.onkeyup =
    function (event) {
      keyEvent(event, false);
    };
}

Events.addListener(new Events.Listener("init", init));

function isSelect() {
  return selectHeld
}

function isReset() {
  return resetHeld
}

function isPause() {
  return pauseHeld
}

function isLeftDiffSet() {
  return leftDiffSet
}

function isRightDiffSet() {
  return rightDiffSet
}

function onCartridgeLoaded() {
  cartridgeLeftSwitch = Cartridge.GetLeftSwitch();
  cartridgeRightSwitch = Cartridge.GetRightSwitch();
}

Events.addListener(
  new Events.Listener("onCartridgeLoaded", onCartridgeLoaded));

function reset() {
  // Reset key maps
  p1KeyMap.reset();
  p2KeyMap.reset();

  // Left difficulty switch defaults to off
  setLeftDiffSet(cartridgeLeftSwitch);

  // Right difficulty switch defaults to on
  setRightDiffSet(cartridgeRightSwitch);
}

export {
  isSelect,
  isReset,
  isPause,
  isLeftDiffSet,
  isRightDiffSet,  
  setLeftDiffSet,
  setRightDiffSet,
  reset,
  p1KeyMap,
  p2KeyMap
}
