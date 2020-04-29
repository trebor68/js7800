import * as Events from "./events.js"
import * as Util from "./util.js"
import * as Storage from "./storage.js"
import highScoreRom64 from "../roms/Highscore.rom"
import * as HsDecode from "./hs-encode-decode.js"

var addProps = Util.addProps;

var SRAM_SIZE = 2048;
var SRAM_OFFSET = 0x1000;
var SRAM_SCORE_OFFSET = 0x113D;

var WRITE_DELAY = 2000; // 2 seconds
var STORAGE_KEY = "highScoreSRAM";

var js7800 = null;
var Main = null;
var debug = false;

var highScoreRom = null;
var hsNullCallback = null;
var hsCallback = null;

var pending = 0;
var timeoutId = null;

//var isGlobal = true;

var sram = new Array(SRAM_SIZE);

function generateDefaultSram(s) {
  for (var i = 0; i < s.length; i++) {
    s[i] = 0;
  }  
  var h = "AABog6pVnAILDgIACx0LBAADBBEBDgARAx8AAAAAAAAAAAAAAAAAABE";
  for (var i = 0; i < 183; i++) h += "A";
  h += "B";
  for (var i = 0; i < 45; i++) h += '/f39';
  h += "/f38";
  base64toSram(h, s);
}

function sramToBase64(s) {
  var out = "";
  for (var i = 0; i < s.length; i++) {
    out += String.fromCharCode(s[i]);
  }
  return btoa(out);
}

function base64toSram(h, s) {
  var b = atob(h);
  for (var i = 0; i < b.length; i++) {
    s[i] = b.charCodeAt(i);
  }
}

function onCartLoaded() {
  // Save any pending writes
  saveSram();

  // Set the high score callback appropriately
  Main.setHighScoreCallback(
    Storage.isLocalStorageEnabled() ? 
      hsCallback : hsNullCallback);
}

function onSramWrite(address, data) {
  var change = false;
  if (sram[address - SRAM_OFFSET] != data) {
    sram[address - SRAM_OFFSET] = data;
    change = true;
  }

  if (change && (address >= SRAM_SCORE_OFFSET)) {
    pending++;
    if (timeoutId == null) {
      timeoutId = setTimeout(function () {
        timeoutId = null;
        saveSram();
      }, WRITE_DELAY);
    }
  }

  if (debug && (address >= SRAM_SCORE_OFFSET)) {
    if (change) {
      console.log("HSC pending write: 0x" + address.toString(16) +
        " = 0x" + data.toString(16) + ", " + pending);
    } else {
      console.log("HSC pending write ignored (no change): 0x" + address.toString(16) +
        " = 0x" + data.toString(16) + ", " + pending);
    }
  }
}

function loadSramLocal(success, failure) {
  console.log("Reading High Score SRAM from local storage.");
  try {
    var h = Storage.readValue(STORAGE_KEY, true);
    if (h) {
      console.log("Found High Score SRAM in local storage.");
      base64toSram(h, sram);
    } else {
      console.log("Not able to find High Score SRAM in local storage.");
    }
    success(sram);  
  } catch (e) {
    failure(e);
  }  
}

function loadSram(postLoadCallback) {
  var fSuccess = function (sram) {
    postLoadCallback(sram);
  };
  var fFailure = function(message) {
    console.log(message);
    Events.fireEvent("showError", message);       
    postLoadCallback(null);        
  };
  
  loadSramLocal(fSuccess, fFailure);
}

function saveSramLocal() {
  console.log("Writing High Score SRAM to local storage.");
  Storage.writeValue(STORAGE_KEY, sramToBase64(sram), true);
}

function saveSram() {
  if (timeoutId != null) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }

  if (pending) {
    pending = 0;
    console.log("HSC Scores have changed, saving.");    

    try {
      saveSramLocal();
    } catch (e) {
      console.log(e);
      Events.fireEvent("showError", e);   
    }      
  } else {
    console.log("HSC Scores have not changed, ignoring.");
  }
}

function init(event) {
  js7800 = event.js7800;
  Main = js7800.Main;

  // Set the debug flag 
  debug = event.debug;

  // Generate the default SRAM
  generateDefaultSram(sram);
  
  // Get high score ROM
  highScoreRom = atob(highScoreRom64.split(',')[1]);
  console.log("High score rom: " + js7800.md5(highScoreRom));

  // Register listener for onCartridgeLoaded
  js7800.Events.addListener(
    new js7800.Events.Listener("onCartridgeLoaded", onCartLoaded));

  // Create and set high score callback
  hsNullCallback = new Main.HighScoreCallback();
  hsCallback = new Main.HighScoreCallback();
  addProps(hsCallback, {
    getRom: function () { return highScoreRom; },
    write: function (address, data) { onSramWrite(address, data); },
    loadSram: function (postLoadCallback) { loadSram(postLoadCallback); }
  });  

  // Add ability to dump state if in debug mode
  if (debug) {
    document.addEventListener('keydown', function (e) {
      if (e.keyCode == 119 /* F8 */) {
        console.log(sramToBase64(sram));
        // TODO: Remove 
        HsDecode.dumpDetails(sram);
      }
    });
  }
}

Events.addListener(
  new Events.Listener("init", function (event) { init(event) }));

Events.addListener(
  new Events.Listener("postInit", function () { 
      // TODO: Remove
      HsDecode.generateTestSram(sram);
  }
));  

export {
  SRAM_SIZE,
  generateDefaultSram,
  sramToBase64,
  base64toSram
}
