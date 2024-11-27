function Rss($scope, $http, $q, $interval) {
	let Parser = require('rss-parser');

	$scope.currentIndex = 0;
	var rss = {};
	rss.feed = [];
	$scope.rss = rss

	rss.get = function () {
		rss.feed = [];
		rss.updated = new moment().format('MMM DD, h:mm a');
		let parser = new Parser();
		if (typeof config.rss != 'undefined' && typeof config.rss.feeds != 'undefined') {
			var promises = [];
			angular.forEach(config.rss.feeds, function (url) {
				promises.push(parser.parseURL(url))
			});

			return $q.all(promises)
		}
	};

	var refreshNews = function () {
		$scope.news = null;
		rss.get().then(function (response) {     
			//console.log("rss data="+JSON.stringify(response))
			//For each feed
			for (var i = 0; i < response.length; i++) {
				for (var j = 0; j < response[i].items.length; j++) {
					var feedEntry = {
						title: response[i].items[j].title,
						//content: response[i].data.query.results.rss.channel.item[j].description[0],
					};
					rss.feed.push(feedEntry);
				}
			}
			$scope.currentIndex = 0;
			$scope.rss = rss;
		});
	};

	var cycleNews = function(){
		$scope.currentIndex = ($scope.currentIndex >= $scope.rss.feed.length)? 0: $scope.currentIndex + 1;
	}

	if (typeof config.rss !== 'undefined' && typeof config.rss.feeds != 'undefined') {
		refreshNews();
		$interval(refreshNews, config.rss.refreshInterval * 60000 || 1800000)
		$interval(cycleNews, 8000)
	}
}


angular.module('SmartMirror')
	.controller('Rss', Rss);
