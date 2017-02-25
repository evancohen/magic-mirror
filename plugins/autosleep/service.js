/* global ipcRenderer */
(function () {
	'use strict';

	function AutoSleepService($interval, Focus) {
		var service = {};
		var autoSleepTimer;
		var fs = require('fs')
		service.woke = true;
		service.scope = "default";
		service.exec = require('child_process').exec;
		var DetectionDir='./motion';
		var DetectionFile=DetectionDir+'/detected';	
		var EneryStarTimer = null;
		var EneryStarTimerStop = null;
			// 14.5 minutes in milliseconds
		var EnergyStarDelay=14.5 * 60 * 1000;
			// forced wakeup to defeat TV energystar power off
		var EnergyStarWakeupDelay=4 * 1000;

		service.startAutoSleepTimer = function () {
			var milliConversion = 60000
			if (typeof config.autoTimer !== 'undefined' && typeof config.autoTimer.autoSleep !== 'undefined' && typeof config.autoTimer.autoWake !== 'undefined') {
				service.stopAutoSleepTimer();
				// assume if autoSleep is greater than 1 minute in milliseconds the value is already converted. if not convert
				if (config.autoTimer.autoSleep > 60000) {
					milliConversion = 1
					console.info('ProTip: Change your config so that config.autoTimer.autoSleep is in minutes not milliseconds.');
				}
				autoSleepTimer = $interval(service.sleep, config.autoTimer.autoSleep * milliConversion);

				// if external motion detection is enabled
				if(config.motion.enabled == true && config.motion.external == true){
					// check to see if the external motion event folder exists
					fs.access(DetectionDir, function(err) {
						// if not
						if (err && err.code === 'ENOENT') {
							// create it
							fs.mkdir(DetectionDir);
							console.debug('created motion directory', DetectionDir);
						}
						fs.watch(DetectionDir, (eventType, filename) => {
							if (filename) {
								//if(eventType === 'rename') {	
									service.CheckExternalMotion();
								//}
							} else {
								console.log('filename not provided');
							}
						});
					});
				}
			}
		};

		// external motion detected
		service.CheckExternalMotion = function () {			
		// remove the file
		fs.unlink(DetectionFile, function(error) { 
			// consume the enonet error
			if(error == null){
				// only need to wake up if asleep
				if(Focus.get() === 'sleep') {
					console.debug('motion detected from external source');
					// wake up now
					service.wake(true);
					}
				}
			});
		};

		service.stopAutoSleepTimer = function () {
			console.debug('Stopping auto-sleep timer');
			$interval.cancel(autoSleepTimer);
			//$interval.cancel(externalMotionTimer);
		};

		service.wake = function (actual) {
			service.woke = true;
			if (config.autoTimer.mode == "monitor") {
				service.exec(config.autoTimer.wakeCmd, service.puts);
			} else if (config.autoTimer.mode == "tv") {
				// is this a real wakeup, or the fake one to handle the enerystar power off problem
				if(actual == true){
					// if the timer was running
					if(EneryStarTimer !=null){
						// stop it
						$interval.cancel(EneryStarTimer)
						EneryStarTimer = null;
					}
					// if the dummy wake up delay is running, stop it too
					if(EneryStarTimerStop !=null){
						$interval.cancel(EneryStarTimerStop)
					}
				}
			}
			Focus.change("default");
			if(actual == true)	{
				console.log("!f:", "")
			}
		};

		// used by the energystar override function
		// done being awake, go back to sleep again
		service.done= function () {
			// go back to sleep
			service.sleep();
			// stop the short term delay timer
			$interval.cancel(EneryStarTimerStop)
			// cancel to long timer
			$interval.cancel(EneryStarTimer)
			// restart it, so we don't drift towards 0 delay 
			EneryStarTimer = $interval(service.bleep, EnergyStarDelay);
		}
		// do the fake, short term wakeup
		service.bleep = function(){
			service.wake(false);
			// start the timer for returning to sleep
			EneryStarTimerStop = $interval(service.done, EnergyStarWakeupDelay);
		}

		service.sleep = function () {
			service.woke = false;
			if (config.autoTimer.mode == "monitor") {
				service.exec(config.autoTimer.sleepCmd, service.puts);
				Focus.change("sleep");
			} else if (config.autoTimer.mode == "tv") {
				Focus.change("sleep");
				if(EneryStarTimer == null) {
					EneryStarTimer = $interval(service.bleep, EnergyStarDelay);
				}
			} else {
				Focus.change("default");
			}
		};

		service.puts = function (error, stdout, stderr) {
			if (error) {
				console.debug('auto-sleep error', error);
			}
			console.debug('autosleep stdout:', stdout)
			console.debug('autosleep stderr:', stderr)
		};


		ipcRenderer.on('motionstart', () => {
			service.wake(true)
			console.debug('motion start detected');
		});

		ipcRenderer.on('remoteWakeUp', () => {
			service.wake(true)
			console.debug('remote wakeUp detected');
		});

		ipcRenderer.on('remoteSleep', () => {
			service.sleep()
			console.debug('remote sleep detected');
		});

		ipcRenderer.on('motionend', () => {
			console.debug('motion end detected');
			service.startAutoSleepTimer();
		});

		ipcRenderer.on('calibrated', () => {
			console.debug('motion.js Calibrated');
		});

		ipcRenderer.on('Error', (event, error) => {
			console.debug("Motion", error);
		});

		return service;
	}

	angular.module('SmartMirror')
		.factory('AutoSleepService', AutoSleepService);

} ());