function Xkcd($scope, $http, SpeechService, Focus) {

	// Show xkcd comic
	SpeechService.addCommand('image_comic', function () {
		$http.get("https://xkcd.com/info.0.json")
			.then(function (response) {
				$scope.xkcd = response.data.img;
				Focus.change("xkcd");
			});
	});

}

angular.module('SmartMirror')
	.controller('Xkcd', Xkcd);