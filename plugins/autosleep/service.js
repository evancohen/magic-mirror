/* global ipcRenderer */
(function () {
	"use strict";

	function AutoSleepService($interval, $rootScope, Focus, MQTTService) {
		var service = {};
		var autoSleepTimer;
		service.woke = true;
		service.scope = "default";
		service.exec = require("child_process").exec;

		var energyStarTimer = null;
		var energyStarTimerStop = null;
		// energyStar timeout is 15 minutes
		// we will wait 14.5 minutes in milliseconds
		var energyStarDelay = 14.5 * 60 * 1000;
		// forced wakeup to defeat TV energystar power off
		var energyStarWakeupDelay = 2 * 1000;

		service.startAutoSleepTimer = function () {
			var milliConversion = 60000;
			// only start timer if enabled, and control values defined
			if (
				typeof config.autoTimer !== "undefined" &&
				config.autoTimer.mode !== "disabled" &&
				typeof config.autoTimer.autoSleep !== "undefined" &&
				typeof config.autoTimer.autoWake !== "undefined"
			) {
				service.stopAutoSleepTimer();
				// assume if autoSleep is greater than 1 minute in milliseconds the value is already converted. if not convert
				if (config.autoTimer.autoSleep > 60000) {
					milliConversion = 1;
					console.info(
						"ProTip: Change your config so that config.autoTimer.autoSleep is in minutes not milliseconds."
					);
				}
				autoSleepTimer = $interval(
					service.sleep,
					config.autoTimer.autoSleep * milliConversion
				);
				console.debug(
					"Starting auto-sleep timer",
					config.autoTimer.autoSleep * milliConversion
				);
			}
		};

		service.stopAutoSleepTimer = function () {
			console.debug("Stopping auto-sleep timer");
			$interval.cancel(autoSleepTimer);
		};

		service.wake = function () {
			if (config.autoTimer.mode !== "disabled") {
				// only wake up if sleeping
				if (Focus.get() === "sleep") {
					service.woke = true;
					$rootScope.$broadcast("userPresence", "true")
					MQTTService.publish("autosleep/state", service.woke)					
					switch (config.autoTimer.mode) {
						case "monitor":
						case "tv":
							service.exec(config.autoTimer.wakeCmd, service.puts);
							Focus.change("default");
							break;
						case "energy":
							Focus.change("default");
							// if the timer was running
							if (energyStarTimer != null) {
								// stop it
								$interval.cancel(energyStarTimer);
								energyStarTimer = null;
							}
							// if the dummy wake up delay is running, stop it too
							if (energyStarTimerStop != null) {
								$interval.cancel(energyStarTimerStop);
							}
							break;
						default:
							Focus.change("default");
					}
				}
			}
		};

		// used by the energystar override function
		// done being awake, go back to sleep again
		var done = function () {
			// go back to sleep
			Focus.change("sleep");
			// stop the short term delay timer
			$interval.cancel(energyStarTimerStop);
			// cancel to long timer
			$interval.cancel(energyStarTimer);
			// restart it, so we don't drift towards 0 delay
			energyStarTimer = $interval(bleep, energyStarDelay);
			// restart the main sleep timer
			service.startAutoSleepTimer();
		};

		// do the fake, short term wakeup
		var bleep = function () {
			Focus.change("default");
			// start the timer for returning to sleep
			energyStarTimerStop = $interval(done, energyStarWakeupDelay);
		};

		service.sleep = function () {
			if (config.autoTimer.mode !== "disabled") {
				service.woke = false;
				$rootScope.$broadcast("userPresence", "false")
				MQTTService.publish("autosleep/state", service.woke)
				switch (config.autoTimer.mode) {
					case "monitor":
					case "tv":
						break;
					case "energy":
						Focus.change("sleep");
						if (energyStarTimer == null) {
							energyStarTimer = $interval(bleep, energyStarDelay);
						} else {
							$interval.cancel(energyStarTimer);
							energyStarTimer = $interval(bleep, energyStarDelay);
						}
						break;
					default:
						Focus.change("default");
				}
			} else {
				Focus.change("default");
			}
		};

		service.puts = function (error, stdout, stderr) {
			if (error) {
				console.debug("auto-sleep error", error);
			}
			console.debug("autosleep stdout:", stdout);
			console.debug("autosleep stderr:", stderr);
		};

		ipcRenderer.on("motionstart", () => {
			service.wake(true);
			console.debug("motion start detected");
		});

		ipcRenderer.on("remoteWakeUp", () => {
			service.wake(true);
			console.debug("remote wakeUp detected");
		});

		ipcRenderer.on("remoteSleep", () => {
			service.sleep();
			console.debug("remote sleep detected");
		});

		ipcRenderer.on("motionend", () => {
			console.debug("motion end detected");
			service.startAutoSleepTimer();
		});
		
		ipcRenderer.on("calibrated", () => {
			console.debug("motion.js Calibrated");
			service.startAutoSleepTimer();
		});

		ipcRenderer.on("Error", (event, error) => {
			console.debug("Motion", error);
		});

		MQTTService.subscribe("autosleep", (message) => {
			message = message.toLowerCase()
			console.log("received mqtt message='" + message+"'")
			if (message === 'wake' || message === 'on')
				service.wake()
			else if (message === 'sleep' || message === 'off') {
				service.sleep() 
			}
			else if (message === 'state') {
				console.log("mqtt returning autosleep state ="+service.woke)
				return service.woke
			}
		})

		return service;
	}

	angular.module("SmartMirror").factory("AutoSleepService", AutoSleepService);
})();
