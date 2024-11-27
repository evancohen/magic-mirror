function Stock($scope, $http, $q, $interval) {
	var Stocks=null
	if(config.stock && config.stock.key){
		Stocks= require('alphavantage')({ key: config.stock.key });
	}
	// request info on each stock, 1 at a time
	var getStockQuotes = function () {
		var promises = [];
		angular.forEach(config.stock.names, function (symbol ) {
			promises.push(Stocks.data.quote(symbol))
		});    
		return $q.all(promises)
	}
  
	var getStocks = function () {
		if(Stocks){
			getStockQuotes().then(function (result) {
				var stock = [];
				if (result instanceof Array) {
					stock = stock.concat(result);
				} else {
					stock.push(result);
				}
				$scope.stock = stock;
			}, function (error) {
				console.log(error);
			});
		} else {
			console.error("stocks not configured")
		}
	}

	getStocks();
	// TODO: Add custom interval.
	// 30 min refresh interval.
	$interval(getStocks, 1800000);
}

angular.module('SmartMirror')
	.controller('Stock', Stock);