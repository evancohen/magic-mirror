const { ipcRenderer } = require("electron");
//const remote = require("@electron/remote")
//const remote  = require("electron").remote;

(function () {
	"use strict";
		try {
			//console.log("args="+JSON.stringify(window.process.argv,null,2))
		}
		catch(ex){

		}
		finally {
			//config.communications_port = 5200
			for(let p of window.process.argv){
				if(p.startsWith("sonusPort")){
					config.communications_port=p.split(":")[1]
					break;
				}
			}
		}
		//console.log("SpeechService sonusPort="+config.communications_port)
	function SpeechService($rootScope, $translate) {
		var service = {};
		var callbacks = {};
		var commandList = [];
		var commandPage = [];

		config.communications_port = 5200 || remote.getGlobal("sonusSocket");

		service.init = function (cb) {
			// workaround so we can trigger requests at any time
			annyang.isListening = () => {
				return true;
			};
			// Set lenguage and debug state
			annyang.setLanguage(
				typeof config.general.language != "undefined"
					? config.general.language
					: "en-US"
			);
			annyang.debug(false);

			// add specified callback functions
			if (isCallback(cb.listening)) {
				callbacks.listening = function (bool) {
					$rootScope.$apply(cb.listening(bool));
				};
			}
			if (isCallback(cb.partialResult)) {
				callbacks.partialResult = function (data) {
					$rootScope.$apply(cb.partialResult(data));
				};
			}
			if (isCallback(cb.finalResult)) {
				callbacks.finalResult = function (data) {
					$rootScope.$apply(cb.finalResult(data));
				};
			}
			if (isCallback(cb.error)) {
				callbacks.error = function (data) {
					$rootScope.$apply(cb.error(data));
				};
			}

			ipcRenderer.on("hotword", () => {
				callbacks.listening(true);
			});

			ipcRenderer.on("partial-results", (event, text) => {
				callbacks.partialResult(text);
			});

			ipcRenderer.on("final-results", (event, text) => {
				callbacks.finalResult(text);
				annyang.trigger(text);
				callbacks.listening(false);
			});
		};

		// Ensure callback is a valid function
		function isCallback(callback) {
			return typeof callback == "function";
		}

		// COMMANDS
		service.commands = {};

		service.addCommand = function (commandId, callback) {
			var voiceId = "commands." + commandId + ".voice";
			var textId = "commands." + commandId + ".text";
			var descId = "commands." + commandId + ".description";
			$translate([voiceId, textId, descId]).then(function (translations) {
				service.addRawCommand(
					translations[voiceId],
					callback,
					translations[descId],
					translations[textId]
				);
			});
		};

		service.addRawCommand = function (
			phrase,
			callback,
			commandDescription,
			commandText
		) {
			var command = {};
			command[phrase] = function (arg1, arg2) {
				$rootScope.$apply(callback(arg1, arg2));
			};
			var commandItem = {
				text: commandText || phrase,
				description: commandDescription,
			};
			commandList.push(commandItem);

			// Extend our commands list
			angular.extend(service.commands, command);

			// Add the commands to annyang
			annyang.addCommands(service.commands);
			console.debug('added command "' + phrase + '"', service.commands);
		};

		service.getCommands = function () {
			for (
				var i = 0;
				i <
				Math.ceil(
					commandList.length / (config.speech.commandsPerPage || 10)
				);
				i++
			) {
				commandPage.push(commandList.splice(i, i + 9));
			}
			return commandPage;
		};

		var recoEngine = null;
		service.openVoiceRecognition = function (speech_output_file) {
			/* eslint-disable no-unused-vars */
			return new Promise((resolve, reject) => {
				// eslint-disable-line no-unused-vars

				try {
					if (!recoEngine) recoEngine = require("recorder");
					// if the speech_output_file is null, then the plugin dialog doesn't require the audio file
					// it will accept the text
					// alexa requires the audio of the speech
					// assistant takes the text
					//
					// we need to negotiate use of the mic for voice collection
					// during dialogs (create a calendar entry add something to my cart, list...)
					//
					// the recorder library  asks sm sonus to disconnect from mic, then start up our own version without
					// hotword (assistant) and maybe reco all together (alexa)
					// after each recording we have no idea if more prompts are coming
					// so the library has to disconnect and tell sm sonus.js to reconnect
					// the plugin needing this service needs to call startVoiceRecognition
					// to start each sequence
					var reco = new recoEngine(config.communications_port, speech_output_file);
					console.log("assistant opening reco engine");
					reco.open()
						.then((e) => {
							console.log("open complete");
							resolve({ handle: reco, events: e });
						})
						.catch((error) => {
							console.log("open error " + error);
						});
				} catch (error) {
					console.log("recorder error=" + error);
				}
			});
			/* eslint-enable no-unused-vars */
		};

		service.startVoiceRecognition = function (handle) {
			if (handle) {
				handle.start();
				callbacks.listening(true);
			}
		};
		/* eslint-disable no-unused-vars */
		service.endVoiceRecognition = function (handle) {
			//if(handle)
			//	handle.stop();
			callbacks.listening(false);
		};
		/* eslint-enable no-unused-vars */

		service.displayVoiceRecognitionText = function (type, text) {
			if (type == "final") {
				if (text) callbacks.finalResult(text);
				callbacks.listening(false);
			}
			if (type == "partial") {
				if (text) callbacks.partialResult(text);
			}
		};

		return service;
	}

	angular.module("SmartMirror").factory("SpeechService", SpeechService);
})(window.annyang);
