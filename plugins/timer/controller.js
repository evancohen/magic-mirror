function Timer($scope, TimerService, SpeechService, Focus) {

	const operationTypes={
		"start":startTimer,"stop":stopTimer,"show":showTimer,"resume":resumeTimer}
	// Start timer
	function startTimer(params) {
		if(typeof params !== 'object'){
			params={name:'default',duration:params, type:"start"}
		}
		console.debug("Starting timer");
		Focus.change("timer");
		$scope.timer = TimerService;
		TimerService.start(params);

		$scope.$watch('timer.countdown', function (countdown) {
			if (countdown === 0) {
				TimerService.stop(params);
				// defaultView();
			}
		});
	}
	SpeechService.addCommand('timer_start',startTimer );

	function showTimer(params={name:'default', type:"show"}) {
		if (TimerService.running) {
			// Update animation
			if (TimerService.paused) {
				TimerService.start(params);
				TimerService.stop(params);
			} else {
				TimerService.start(params);
			}

			Focus.change("timer");
		}
	}
	// Show timer
	SpeechService.addCommand('timer_show', showTimer );

	function stopTimer(params={name:'default', type:"stop"}) {
		if (TimerService.running && !TimerService.paused) {
			TimerService.stop(params);
		}
	}

	// Stop timer
	SpeechService.addCommand('timer_stop', stopTimer);

	function resumeTimer(params={name:'default', type:"resume"}) {
		if (TimerService.running && TimerService.paused) {
			TimerService.start(params);
			Focus.change("timer");
		}
	}
	// Resume timer
	SpeechService.addCommand('timer_resume',resumeTimer );

	$scope.$on('TimerService', (events,params)=>{
		if(params && params.type){
			if (Object.keys(operationTypes).contains(params.type.toLowerCase())){
				operationTypes[params.type.toLowerCase()](params)
			}
		}
	})
}


angular.module('SmartMirror')
	.controller('Timer', Timer);

