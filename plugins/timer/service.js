(function (angular) {
	'use strict';

	/**
   * Factory function for the timer service
   */
	var TimerService = function ($rootScope, $interval, $filter) {
		var service = {};
		service.running = false;
		service.paused = true;
		service.duration = 0;
		service.countdown = -1;
		//service.timerlist={}

		/**
     * Parse spoken duration into seconds
     * @param  {String} string - e.g.: `1 minute` or `5 minutes and 10 seconds`
     * @return {Number}        - duration in seconds
     */
		var parseDuration = function (string) {

			string = string
				.replace(new RegExp($filter('translate')('timer.one'), 'ig'), '1')
				.replace(new RegExp($filter('translate')('timer.minute'), 'i'), 'minutes')
				.replace(new RegExp($filter('translate')('timer.second'), 'i'), 'seconds');

			console.log(string);
			var pattern = '([0-9]+) ?(minutes|seconds)';
			var matches = string.match(new RegExp(pattern, 'ig'));
			var duration = moment.duration(0);
			for (var i = 0; i < matches.length; i++) {
				var match = matches[i].match(pattern);
				if (match.length) {
					duration.add(parseInt(match[1], 10), match[2]);
				}
			}
			return duration.asSeconds();
		};

		var intervalId;
		var startTimer = function () {
			service.running = true;
			return $interval(function () {
				service.countdown--;
			}, 1000);
		};

		service.start = function (params) {
			//if (angular.isDefined(duration)) {
				// get seconds of timer duration
			let duration=params.duration
			if( params.duration != undefined){
				if ( isNaN(params.duration)) {
					duration = parseDuration(params.duration);
				}
				if (service.running) {
					service.reset();
				}
				service.countdown = duration;
				service.duration = duration;

				$rootScope.$broadcast("timer:init", duration);
			}
			if (service.countdown > 0) {
				if (angular.isDefined(intervalId)) {
					service.stop();
				}
				intervalId = startTimer();
				service.paused = false;


				$rootScope.$broadcast("timer:start", service.countdown);
			}
		};

		service.stop = function () {
			if (angular.isDefined(intervalId)) {
				$interval.cancel(intervalId);
				intervalId = undefined;
				service.paused = true;

				$rootScope.$broadcast("timer:stop", service.countdown);
			}
		};

		service.reset = function () {
			service.running = false;
			service.countdown = -1;
			service.stop();
		};

		return service;
	}

	/**
   * Filter for parsing seconds to date
   */
	var secondsToDateTime = function () {
		return function (seconds) {
			return new Date(1970, 0, 1).setSeconds(seconds);
		};
	};

	/**
   * Directive for the svg circle
   */
	var TimerCircle = function () {
		return {
			replace: true,
			template: '<svg><circle class="background"></circle><circle class="progress"></circle></svg>',
			link: function (scope, element) {
				var circle = angular.element(element[0].querySelector('.progress'));

				scope.$on('timer:init', function (event, duration) {
					circle.css({
						animationPlayState: 'paused',
						animationDuration: duration + 's'
					});

					console.debug('timer:init', duration);
				});

				scope.$on('timer:start', function (event, countdown) {
					var current = circle.css('animation-duration').slice(0, -1);

					circle.css({
						display: 'none',
						animationDelay: -(current - countdown) + 's',
						animationPlayState: 'running'
					});

					// trigger reflow to reset the animation
					circle[0].getBoundingClientRect();

					setTimeout(function () {
						circle.css({
							display: ''
						});
					}, 0);

					console.debug('timer:start');
				});

				scope.$on('timer:stop', function (event, countdown) {
					if (countdown > 0) {
						circle.css({
							animationPlayState: 'paused'
						});
					} else {
						circle.css({
							animationDuration: '',
							animationDelay: ''
						});
					}

					console.debug('timer:stop');
				});
			}
		};
		function signalForTimer(params){
			console.log("signaling timer="+JSON.stringify(params))
			$rootScope.$broadcast('TimerService',params)
		}
		service.startTimer=service.stopTimer=service.resumeTimer=service.showTimer=signalForTimer
	};

	angular.module('SmartMirror')
		.factory('TimerService', TimerService)
		.filter('secondsToDateTime', secondsToDateTime)
		.directive('timerCircle', TimerCircle);

} (window.angular));
