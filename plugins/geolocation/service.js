(function () {
	'use strict';
	/*
		 var position = {
		 latitude: 78.23423423,
		 longitude: 13.123124142
		 }
		 deferred.resolve(position);
		 */
	function GeolocationService($q, $rootScope, $window, $http) {

		var service = {};
		var geoloc = null;

		service.getLocation = function (parms) {
			//var deferred = $q.defer();
			return new Promise((resolve,reject)=>{
				// Use geo postion from config file if it is defined
				if( config.geoPosition
					&& typeof config.geoPosition.latitude != 'undefined'
					&& typeof config.geoPosition.longitude != 'undefined') {
					/*deferred.*/resolve({
						coords: {
							latitude: config.geoPosition.latitude,
							longitude: config.geoPosition.longitude,
						},
					});
					//geoloc = deferred.promise;
				} else {
					// if we haven't requested info yet
					//if (geoloc == null) {
						var body={};
						if(parms!=null)
							body = parms
						// if we have a key
						if(config.geoPosition && config.geoPosition.key) {
							//geoloc = deferred.promise;
							body.considerIp=true;
							$http.post("https://www.googleapis.com/geolocation/v1/geolocate?key="+config.geoPosition.key, body).then(
								function (result) {
									var location = angular.fromJson(result).data.location
									/*deferred.*/resolve({ 'coords': { 'latitude': location.lat, 'longitude': location.lng } })
								},
								function (err) {
									/*deferred.*/ reject("Failed to retrieve geolocation.eeror ="+ err)
								}
							);
						}
						else
							/*deferred.*/ reject("Failed to retrieve geolocation.eeror ="+ "no key provided");
					}
				//}
			})
			//return geoloc?geoloc:deferred.promise;
		}
		return service;
	}
	angular.module('SmartMirror')
		.factory('GeolocationService', GeolocationService);
} ());
