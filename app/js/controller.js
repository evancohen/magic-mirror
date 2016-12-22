(function (angular) {
    'use strict';

    function MirrorCtrl(
        SpeechService,
        AutoSleepService,
        LightService,
        $rootScope, $scope, $timeout, $interval, tmhDynamicLocale, $translate) {

        // Local Scope Vars
        var _this = this;
        $scope.listening = false;
        $scope.debug = false;
        $scope.focus = "default";
        $scope.commands = [];
        $scope.partialResult = $translate.instant('home.commands');
        $scope.layoutName = 'main';
        $scope.config = config;

        //set lang
        moment.locale(
            (typeof config.language !== 'undefined') ? config.language.substring(0, 2).toLowerCase() : 'en',
            {
                calendar: {
                    lastWeek: '[Last] dddd',
                    lastDay: '[Yesterday]',
                    sameDay: '[Today]',
                    nextDay: '[Tomorrow]',
                    nextWeek: 'dddd',
                    sameElse: 'L'
                }
            }
        );
        //Initialize the speech service

        var resetCommandTimeout;
        SpeechService.init({
            listening: function (listening) {
                $scope.listening = listening;
            },
            partialResult: function (result) {
                $scope.partialResult = result;
                $timeout.cancel(resetCommandTimeout);
            },
            finalResult: function (result) {
                if (typeof result !== 'undefined') {
                    $scope.partialResult = result;
                    resetCommandTimeout = $timeout(restCommand, 5000);
                }
            },
            error: function (error) {
                console.log(error);
                if (error.error == "network") {
                    $scope.speechError = "Google Speech Recognizer: Network Error (Speech quota exceeded?)";
                }
            }
        });

        //Update the time
        function updateTime() {
            $scope.date = new moment();

            // Auto wake at a specific time
            if (typeof config.autoTimer !== 'undefined' && typeof config.autoTimer.autoWake !== 'undefined' && config.autoTimer.autoWake == moment().format('HH:mm:ss')) {
                console.debug('Auto-wake', config.autoTimer.autoWake);
                $scope.focus = "default";
                AutoSleepService.wake();
                AutoSleepService.startAutoSleepTimer();
            }
        }

        // Reset the command text
        var restCommand = function () {
            $translate('home.commands').then(function (translation) {
                $scope.partialResult = translation;
            });
        };

        _this.init = function () {
            AutoSleepService.startAutoSleepTimer();

            var tick = $interval(updateTime, 1000);
            updateTime();
            restCommand();

            var defaultView = function () {
                console.debug("Ok, going to default view...");
                $scope.focus = "default";
            }

            // List commands
            SpeechService.addCommand('list', function () {
                console.debug("Here is a list of commands...");
                console.log(SpeechService.commands);
                $scope.commands = SpeechService.getCommands();
                $scope.focus = "commands";
            });

            // Go back to default view
            SpeechService.addCommand('home', defaultView);

            // Hide everything and "sleep"
            SpeechService.addCommand('sleep', function () {
                console.debug("Ok, going to sleep...");
                $scope.focus = "sleep";
            });

            // Go back to default view
            SpeechService.addCommand('wake_up', defaultView);

            // Turn off HDMI output
            // THESE ARE BROKEN
            SpeechService.addCommand('screen off', function () {
                console.debug('turning screen off');
                AutoSleepService.sleep();
            });

            // Turn on HDMI output
            SpeechService.addCommand('screen on', function () {
                console.debug('turning screen on');
                AutoSleepService.wake();
                $scope.focus = "default"
            });

            // Hide everything and "sleep"
            SpeechService.addCommand('debug', function () {
                console.debug("Boop Boop. Showing debug info...");
                $scope.debug = true;
            });

            // Check the time
            SpeechService.addCommand('time_show', function (task) {
                console.debug("It is", moment().format('h:mm:ss a'));
            });

            // Control light
            SpeechService.addCommand('light_action', function (state, action) {
                LightService.performUpdate(state + " " + action);
            });
        };

        _this.init();
    }

    angular.module('SmartMirror')
        .controller('MirrorCtrl', MirrorCtrl);

    function themeController($scope) {
        $scope.layoutName = (typeof config.layout !== 'undefined' && config.layout) ? config.layout : 'main';
    }

    angular.module('SmartMirror')
        .controller('Theme', themeController);

} (window.angular));
