const electron = require("electron");
// Child Process for keyword spotter
const { spawn, exec } = require("child_process");
// Smart mirror remote
const remote = require("./remote.js");
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

//const { BrowserWindow } = require('@electron/remote/main')

// In the main process:
require('@electron/remote/main').initialize()
// Prevent the monitor from going to sleep.
const powerSaveBlocker = electron.powerSaveBlocker;
powerSaveBlocker.start("prevent-display-sleep");
// process the plugin location info
const loader = require("./app/js/loader.js");
// used to get free port for background process socket.io communications
const getPort = require("get-port");

// Launching the mirror in dev mode
const DevelopmentMode = process.argv.includes("dev");
let usepm2 = false;
// Replace with:
const debug =DevelopmentMode?true:false;


//if (debug) console.log("getting pm2 process list");
exec("pm2 jlist", (error, stdout) => {
  if (!error) {
    let output = JSON.parse(stdout);
    if (debug)
      console.log(
        "processing pm2 jlist output, " + output.length + " entries"
      );
    output.forEach((managed_process) => {
      if(debug)
        console.log("comparing "+__dirname +" with "+ managed_process.pm2_env.pm_cwd )
      // if we find a pm2 process matching our location
      // and that process is online, then it is us
      if (managed_process.pm2_env.pm_cwd.startsWith(__dirname) && managed_process.pm2_env.status ==="online") {
        if (debug)
          console.log(
            "found our pm2 entry, id=" + managed_process.pm_id
          );
        usepm2 = true;
      }
    });
  }
});
//var atomScreen = null;
// Load the smart mirror config
let config;
let firstRun = false;
let kwsProcess = null;
let quitting = false;
try {
	config = require("./config.json");
} catch (e) {
	let error = "Unknown Error";
	config = require("./remote/.config.default.json");
	firstRun = true;
	if (typeof e.code !== "undefined" && e.code === "MODULE_NOT_FOUND") {
		error =
			"Initial startup detected\nPlease configure your mirror by opening a browser with the remote address shown below...";
	} else if (typeof e.message !== "undefined") {
		//console.log(e)
		error =
			"Syntax Error. \nLooks like there's an error in your config file: " +
			e.message +
			"\n" +
			"Protip: You might want to paste your config file into a JavaScript validator like http://jshint.com/";
	}
	console.log(error);
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
	app.disableHardwareAcceleration();
function createWindow() {
	app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");
	app.commandLine.appendSwitch("disable-http-cache");

	// Get the displays and render the mirror on a secondary screen if it exists
	var atomScreen = null;
	if (electron.screen == undefined) {
		atomScreen = electron.remote.screen;
	} else {
		atomScreen = electron.screen;
	}

	var displays = atomScreen.getAllDisplays();
	var externalDisplay = null;
	for (var i in displays) {
		if (displays[i].bounds.x > 0 || displays[i].bounds.y > 0) {
			externalDisplay = displays[i];
			break;
		}
	}

	const { width, height } = atomScreen.getPrimaryDisplay().workAreaSize;
	var browserWindowOptions = {
		width: width,
		height: height,
		icon: "favicon.ico",
		kiosk: true,
		autoHideMenuBar: true,
		darkTheme: true,
		backgroundColor: "#00000001",
		webPreferences: {
			nodeIntegration: true,
			enableRemoteModule: true,
			contextIsolation: false,
			additionalArguments:["sonusPort:"+global.sonusSocket]
		},
	};
	if (externalDisplay) {
		browserWindowOptions.x = width; //+ 2; //externalDisplay.bounds.x + 50
		browserWindowOptions.y = height; //externalDisplay.bounds.y + 50
		if(debug)
			console.log(
				"display size=" + browserWindowOptions.x + "+" + browserWindowOptions.y
			);
	}

	// Create the browser window.
	mainWindow = new BrowserWindow(browserWindowOptions);

	// load the plugins found and customize the plugin layout
	var fn = loader.loadPluginInfo(__dirname + "/index.html", config);

	// and load the updated index.html of the app.
	mainWindow.loadURL("file://" + __dirname + fn);
	// Open the DevTools if run with "npm start dev"
	if (DevelopmentMode) {
		mainWindow.webContents.openDevTools();
	}

	// Emitted when the window is closed.
	mainWindow.on("closed", function () {
		// Dereference the window object, usually you would store windows
		// in an array if your app supports multi windows, this is the time
		// when you should delete the corresponding element.
		mainWindow = null;
	});
}

function startSonus(port) {
	// Initilize the keyword spotter
	kwsProcess = spawn("node", ["./sonus.js", port], { detached: false });
	// Handel messages from node
	kwsProcess.stderr.on("data", function (data) {
		var message = data.toString();
		console.error("ERROR", message.substring(4));
	});

	kwsProcess.stdout.on("data", function (data) {
		var message = data.toString();
		if (message.startsWith("!h:")) {
			mainWindow.webContents.send("hotword", true);
		} else if (message.startsWith("!p:")) {
			mainWindow.webContents.send("partial-results", message.substring(4));
		} else if (message.startsWith("!f:")) {
			mainWindow.webContents.send("final-results", message.substring(4));
		} else {
			console.error(message.substring(3));
		}
	});

	// if we receive a closed event from the keyword spotter
	kwsProcess.on("close", function () {
		// if main process is not ending
		if (quitting == false) {
			// restart it
			startSonus(config.communications_port);
		}
	});
}

// Initilize the keyword spotter
if (config && config.speech && !firstRun) {
	// get the sonus communications socket port
	getPort({ port: getPort.makeRange(9000, 9500) }).then((port) => {
		if(debug)
			console.log("found port="+port)
		//console.log("global="+JSON.stringify(global,null,2))
		global.sonusSocket = port;
		config.communications_port = port;
		startSonus(config.communications_port);
	});
}

if ((config.remote && config.remote.enabled) || firstRun) {
	remote.start(config);

	// Deturmine the local IP address
	const interfaces = require("os").networkInterfaces();
	let addresses = [];
	for (let k in interfaces) {
		for (let k2 in interfaces[k]) {
			let address = interfaces[k][k2];
			if (address.family === "IPv4" && !address.internal) {
				addresses.push(address.address);
			}
		}
	}
	console.log(
		"Remote listening on http://%s:%d",
		addresses[0],
		config.remote.port
	);

	remote.on("command", function (command) {
		mainWindow.webContents.send("final-results", command);
	});

	remote.on("connected", function () {
		mainWindow.webContents.send("connected");
	});

	remote.on("disconnected", function () {
		mainWindow.webContents.send("disconnected");
	});

	remote.on("devtools", function (open) {
		if (open) {
			mainWindow.webContents.openDevTools();
		} else {
			mainWindow.webContents.closeDevTools();
		}
	});

	remote.on("kiosk", function () {
		if (mainWindow.isKiosk()) {
			mainWindow.setKiosk(false);
		} else {
			mainWindow.setKiosk(true);
		}
	});

	remote.on("reload", function () {
		mainWindow.reload();
	});

	remote.on("wakeUp", function () {
		mainWindow.webContents.send("remoteWakeUp", true);
	});
	remote.on("sleep", function () {
		mainWindow.webContents.send("remoteSleep", true);
	});

	remote.on("relaunch", function (newConfig) {
		console.log("Relaunching...");
		// rebuild the html file plugin position info, from the NEW config data
		// if pm2 is not being used for this process control
		if (!usepm2) {
			// recalc plugin info since something changed
			loader.loadPluginInfo(__dirname + "/index.html", newConfig);
			// force reload
			app.relaunch();
		}
		// else die and pm2 will restart us
		app.quit();
	});
}

// Motion detection
var mtnProcess = null;
if (config.motion && config.motion.enabled) {
	if (config.motion.enabled == "pin") {
		// use npm to start for sudo needed by raspio
		mtnProcess = spawn("npm", ["run", "motion"], { detached: false });
	}
	// don't need npm, just launch script
	else mtnProcess = spawn("node", ["./motion.js"], { detached: false });
	// Handel messages from node
	mtnProcess.stderr.on("data", function (data) {
		var message = data.toString();
		console.error("ERROR", message.substring(4));
	});

	mtnProcess.stdout.on("data", function (data) {
		var message = data.toString();
		//console.log("motion message="+message)
		if (message.startsWith("!s:")) {
			//console.log(message.substring(3));
			mainWindow.webContents.send("motionstart", true);
		} else if (message.startsWith("!e:")) {
			//console.log(message.substring(3));
			mainWindow.webContents.send("motionend", true);
		} else if (message.startsWith("!c:")) {
			//console.log(message.substring(3));
			mainWindow.webContents.send("calibrated", true);
		} else if (message.startsWith("!E:")) {
			//console.log(message.substring(3));
			mainWindow.webContents.send("Error", message.substring(3));
			mtnProcess.kill();
		} else {
			console.error(message);
		}
	});
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", function () {
	app.quit();
});

// No matter how the app is quit, we should clean up after ourselvs
app.on("will-quit", function () {
	if (kwsProcess) {
		quitting = true;
		kwsProcess.kill();
	}
	// While cleaning up we should turn the screen back on in the event
	// the program exits before the screen is woken up
	if (mtnProcess) {
		mtnProcess.kill();
	}
	if (
		config.autoTimer &&
		config.autoTimer.mode !== "disabled" &&
		config.autoTimer.wakeCmd
	) {
		exec(config.autoTimer.wakeCmd).kill();
	}
});
