(function () {
	'use strict';

	function WeatherService($window, $http, $q) {

		var language =
			typeof config.general.language !== "undefined"
				? config.general.language.substr(0, 2)
				: "en"
		var service = {};

		service.events = [];
		service.get= {}
		service.getCountry = function (geoposition) {
			return new Promise((resolve, reject) => {
				if (config.forecast.keytype != "Darksky") {
					// forecast untis will be changed from auto to resolved type,
					// so this api call is ececuted only once per sm execution
					// if units is auto, try to discover if this is USA or not
					if (config.forecast.units === "auto") {
						// if the geoposition api key is set
						if(config.geoPosition.key){
							let url= "https://maps.googleapis.com/maps/api/geocode/json?latlng="+
										geoposition.coords.latitude.toString().substring(0, 10) +
										"," +
										geoposition.coords.longitude.toString().substring(0, 11) +
										"&key="+config.geoPosition.key
							$http
								.get(
									url
								)
								.then((results) => {
									// point to the first data entry
									let addresses=results.data.results[0].address_components
									// get just the country entry
									let info = addresses.filter((entry) =>{
											return JSON.stringify(entry.types) === JSON.stringify(['country','political'])
									})
									if(info.length){
										if(info[0].short_name === 'US')
											config.forecast.units = "us"
										else config.forecast.units = "si"
										service.weather={}
										service.weather["forecast"] = info
										if(service.weather["forecast"]===null)
											service.weather["forecast"] = {}
										service.weather.forecast.data = {}
										service.weather.forecast.data["currently"] = []
										// set the currently
										service.weather.forecast.data.currently["data"] = null
										resolve((service.weather))											
									} else {
										console.error("weather unable to determine country from geolocation")
										reject()
									}
								})
								.catch((error) => {
									console.error(
										"weather google geocode country from geolocation failed =" +
											JSON.stringify(error)
									)
									reject()
								})
						}
						else {
							console.error("geoposition apikey not set, needed by weather");
							reject()  //
						}
					} else 
						resolve(null)
				} else {
					// darksky, nothign to do here
					resolve(null)
				}
			})
		}
		service.get.Openweather = function (geoposition) {
			return new Promise((resolve, reject) => {
				//$http.get("https://api.openweathermap.org/data/2.5/onecall?lat=30.4548443&lon=-97.6222674&appid=a6bf9feaa86bc2677df1e5f46bd79d55")
				$http
					.get(
						"https://api.openweathermap.org/data/3.0/onecall?lat=" +
							geoposition.coords.latitude.toString().substring(0, 10) +
							"&lon=" +
							geoposition.coords.longitude.toString().substring(0, 11) +
							"&units=" +
							(config.forecast.units == "us" ? "imperial" : "metric") +
							"&appid=" +
							config.forecast.key
					)
					.then(function (response) {
						//console.log("json="+JSON.stringify(response.data));
							service.weather={}
							//service.weather["forecast"] = response.data
							//if(service.weather["forecast"]===null || service.weather["forecast"]=== undefined)
							service.weather["forecast"] = response.data
							// set the currently
							service.weather.forecast.data = response.data
							resolve((service.weather))
					})
					.catch(() => {
						reject()
					})
			})
		}
		service.get.Darksky = function (geoposition) {
			return new Promise((resolve, reject) => {
				$http
					.jsonp(
						"https://api.darksky.net/forecast/" +
							config.forecast.key +
							"/" +
							geoposition.coords.latitude +
							"," +
							geoposition.coords.longitude +
							"?units=" +
							config.forecast.units +
							"&lang=" +
							language +
							"&callback=JSON_CALLBACK"
					)
					.then(function (response) {
						//console.log("json="+JSON.stringify(response.data));
						service.weather={}
						service.weather.forecast={}
						service.weather.forecast.data = response.data
						resolve((service.weather))
					})
					.catch(() => {
						reject()
					})
			})
		}
		service.get.PirateWeather = function (geoposition) {
			return new Promise((resolve, reject) => {
				$http
					.get( //.jsonp(
						"https://api.pirateweather.net/forecast/" +
							config.forecast.key +
							"/" +
							geoposition.coords.latitude +
							"," +
							geoposition.coords.longitude +
							"?units=" +
							config.forecast.units
						//	+
						//	"&lang=" +
						//	language +
						//	"&callback=JSON_CALLBACK"
					)
					.then(function (response) {
						//console.log("json="+JSON.stringify(response.data));
						service.weather={}
						service.weather.forecast={}
						service.weather.forecast.data = response.data
						resolve((service.weather))
					})
					.catch((error) => {
						console.log("error="+JSON.stringify(error))
						reject()
					})
			})
		}
		service.get.Climacell = function (geoposition) {
			// return a promise, so the caller can wait
			return new Promise((resolve, reject) => {
				// list of concurrent requests
				var plist = []
				var forecast = null
				var currently = null
				// "https://data.climacell.co/v4/timelines?timesteps=1h&units=" + this.config.tempUnits + "&location=" + this.config.lat + "," + this.config.lon + "&fields=temperature,temperatureApparent,precipitationType,humidity,windSpeed,windDirection,weatherCode&apikey=" + this.config.apiKey

				plist.push(	$http.get(
					/* 'https://api.climacell.co/v3/weather/realtime?lat=' +
					geoposition.coords.latitude.toString().substring(0,10) + '&lon=' + geoposition.coords.longitude.toString().substring(0,11) + '&unit_system=' +
					config.forecast.units + '&fields=temp%2Cprecipitation%2Cweather_code%2Ccloud_cover%2Csunrise%2Csunset%2Cvisibility%2Cwind_gust%2Cwind_speed&apikey='+config.forecast.key  */
					"https://data.climacell.co/v4/timelines?timesteps=1h"+
						"&units=" + 'metric' + //config.forecast.units +
						"&location=" + geoposition.coords.latitude.toString().substring(0,10) + "," + geoposition.coords.longitude.toString().substring(0,11) +
						"&fields=temperature,temperatureApparent,precipitationType,humidity,windSpeed,windDirection,weatherCode"+
						"&apikey="+config.forecast.key
				).then(
					(response)=>{
						currently=response.data.data;
					}
				).catch((error)=>{
					console.log("climacell realltime failed ="+JSON.stringify(error))
					reject();
				})
				)
				// get the 10 day forecast info
				plist.push($http.get(
					"https://data.climacell.co/v4/timelines?timesteps=1d"+
					'&location=' + geoposition.coords.latitude.toString().substring(0,10) + ',' + geoposition.coords.longitude.toString().substring(0,11) +
					"&units=" + 'metric' + //	config.forecast.units +
					'&fields=temperatureMax,temperatureMin,precipitationType,weatherCode'+
					'&apikey='+config.forecast.key
				).then(
					(response)=>{
						forecast=response.data.data;
					}
				).catch( (error)=>{
					console.log("climacell forecast failed ="+JSON.stringify(error))
					reject();
				})
				)

				// wait for both above apis to complete
				Promise.all(plist).then(() => {
					// save the total data
					service.weather={}
					service.weather["forecast"] = forecast
					if(service.weather["forecast"]===null)
						service.weather["forecast"] = {}
					service.weather.forecast.data = {}
					service.weather.forecast.data["currently"] = []
					// set the currently
					service.weather.forecast.data.currently["data"] = currently
					resolve(service.weather)
				})
			})
		}
		service.setCurrent=function(currentdata){service.weatherdata=currentdata}
		service.getWeatherData=function(){return service.weatherdata}
		return service;
	}

	angular.module('SmartMirror')
		.factory('WeatherService', WeatherService);
} ());		






