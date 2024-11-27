(function (angular) {
	"use strict";

	function MirrorCtrl(
		Focus,
		SpeechService,
		MQTTService,
		AutoSleepService,
		$rootScope,
		$scope,
		$timeout,
		$interval,
		tmhDynamicLocale,
		$translate
	) {
		// Local Scope Vars
		var _this = this;
		$scope.listening = false;
		$scope.debug = false;
		$scope.commands = [];
		$scope.partialResult = $translate.instant("home.commands");
		$scope.layoutName = "main";
		$scope.config = config;

		// Set up our Focus
		$rootScope.$on("focus", function (targetScope, newFocus) {
			$scope.focus = newFocus;
		});

		Focus.change("default");

		//set lang
		if (config.general.language.substr(0, 2) == "en") {
			moment.locale(config.general.language, {
				calendar: {
					lastWeek: "[Last] dddd",
					lastDay: "[Yesterday]",
					sameDay: "[Today]",
					nextDay: "[Tomorrow]",
					nextWeek: "dddd",
					sameElse: "L",
				},
			});
		} else {
			moment.locale(config.general.language);
		}
		//Initialize the speech service

		var resetCommandTimeout;
		var listeningTimeout;
		MQTTService.start();
		SpeechService.init({
			listening: function (listening) {
				$scope.listening = listening;
				listeningTimeout= $timeout(clearListening,12000)
				if (listening && !AutoSleepService.woke) {
					AutoSleepService.wake();
					$scope.focus = AutoSleepService.scope;
				}
			},
			partialResult: function (result) {
				$scope.partialResult = result;
				$timeout.cancel(resetCommandTimeout);
			},
			finalResult: function (result) {
				if (typeof result !== "undefined") {
					$scope.partialResult = result;
					$timeout.cancel(listeningTimeout);
					resetCommandTimeout = $timeout(restCommand, 5000);
				}
			},
			error: function (error) {
				console.log(error);
				if (error.error == "network") {
					$scope.speechError =
						"Google Speech Recognizer: Network Error (Speech quota exceeded?)";
				}
			},
		});

		//Update the time
		function updateTime() {
			$scope.date = new moment();

			// Auto wake at a specific time
			if (
				typeof config.autoTimer !== "undefined" &&
				config.autoTimer.mode !== "disabled" &&
				typeof config.autoTimer.autoWake !== "undefined" &&
				config.autoTimer.autoWake == moment().format("HH:mm:ss")
			) {
				console.debug("Auto-wake", config.autoTimer.autoWake);
				AutoSleepService.wake();
				$scope.focus = AutoSleepService.scope;
				AutoSleepService.startAutoSleepTimer();
			}
			$rootScope.$broadcast("clock-tick",$scope.date)
		}
		var clearListening = function(){
			$scope.listening = false;
		}
		// Reset the command text
		var restCommand = function () {
			$translate("home.commands").then(function (translation) {
				$scope.partialResult = translation;
			});
		};

		_this.init = function () {
			AutoSleepService.startAutoSleepTimer();

			$interval(updateTime, 1000);
			updateTime();
			restCommand();

			var defaultView = function () {
				console.debug("Ok, going to default view...");
				Focus.change("default");
			};
			// List commands
			SpeechService.addCommand("list", function () {
				console.debug("Here is a list of commands...");
				console.log(SpeechService.commands);
				$scope.commands.commandPage = [];
				$scope.commands.commandPage = SpeechService.getCommands();
				$scope.commands.index = 0;
				$scope.commands.totalPages = $scope.commands.commandPage.length;
				Focus.change("commands");
			});

			SpeechService.addCommand("list-page", function (pageNum) {
				if (Focus.get() == "commands") {
					$scope.commands.commandPage = [];
					$scope.commands.commandPage = SpeechService.getCommands();
					$scope.commands.totalPages =
						$scope.commands.commandPage.length;
					if (isNaN(pageNum)) {
						pageNum = $scope.units[pageNum];
					}
					if (pageNum >= 1 && pageNum <= $scope.commands.totalPages) {
						$scope.commands.index = pageNum - 1;
					}
				}
			});

			// Next Page
			SpeechService.addCommand("list-next", function () {
				if (Focus.get() == "commands") {
					$scope.commands.commandPage = [];
					$scope.commands.commandPage = SpeechService.getCommands();
					$scope.commands.totalPages =
						$scope.commands.commandPage.length;
					if (
						$scope.commands.index <
						$scope.commands.totalPages - 1
					) {
						$scope.commands.index++;
					}
				}
			});

			// Prev Page
			SpeechService.addCommand("list-prev", function () {
				if (Focus.get() == "commands") {
					$scope.commands.commandPage = [];
					$scope.commands.commandPage = SpeechService.getCommands();
					$scope.commands.totalPages =
						$scope.commands.commandPage.length;
					if ($scope.commands.index > 0) {
						$scope.commands.index--;
					}
				}
			});

			// Go back to default view
			SpeechService.addCommand("home", defaultView);

			SpeechService.addCommand("debug", function () {
				console.debug("Boop Boop. Showing debug info...");
				$scope.debug = true;
			});

			// Check the time
			SpeechService.addCommand("time_show", function () {
				console.debug("It is", moment().format("h:mm:ss a"));
			});

		};

		_this.init();

	}

	angular.module("SmartMirror").controller("MirrorCtrl", MirrorCtrl);

	function themeController($scope) {
		$scope.layoutName =
			typeof config.general.layout !== "undefined" &&
			config.general.layout
				? config.general.layout
				: "main";
	}

	angular.module("SmartMirror").controller("Theme", themeController);
})(window.angular);
