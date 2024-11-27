function Weather($scope, $rootScope, $interval, $http, $translate, GeolocationService, WeatherService) {
	var language =
		typeof config.general.language !== "undefined"
			? config.general.language.substr(0, 2)
			: "en"
	var geoposition = {}
	var weather = {}
	weather.get = {}

	weather.minutelyForecast = function (weather) {
		if (weather.forecast === null) {
			return null
		}
		return weather.forecast.data.minutely

	}
	function min(a, b) {
		return a > b ? b : a
	}

	function cvttof(temp, units){
		let r= temp
		if (units == 'us'){
			r= ((r*9)/5)+32
		}
		return r
	}
	//Returns the current forecast along with high and low tempratures for the current day
	weather.currentForecast = function (weather) {
		if (weather.forecast === null) {
			return null
		}
		let ctemp = 0
		switch (config.forecast.keytype) {
			case "Darksky":
			case "PirateWeather":
				weather.forecast.data.currently.day = moment
					.unix(weather.forecast.data.currently.time)
					.format("ddd")
				weather.forecast.data.currently.temperature = parseFloat(
					weather.forecast.data.currently.temperature
				).toFixed(0)
				weather.forecast.data.currently.wi =
					"wi-forecast-io-" + weather.forecast.data.currently.icon
				weather.forecast.data.currently.iconAnimation =
					weather.forecast.data.currently.icon
				break
			case "Climacell":
				ctemp = cvttof(
					weather.forecast.data.currently.data.timelines[0].intervals[0].values
						.temperature,
					config.forecast.units
				)
				weather.forecast.data.currently.day = moment
					.utc(weather.forecast.data.currently.data.timelines[0].startTime)
					.format("ddd")
				weather.forecast.data.currently.temperature = parseFloat(ctemp).toFixed(
					0
				)
				weather.forecast.data.currently.wi =
					"wi-forecast-io-" +
					convert_conditions_to_icon(
						weather.forecast.data.currently.data.timelines[0].intervals[0]
							.values.weatherCode,
						null,
						null,
						"utc"
					)
				break
			case "Openweather":
				weather.forecast.data["currently"] = {}
				weather.forecast.data.currently.day = moment
					.utc(weather.forecast.data.current.dt)
					.format("ddd")
				weather.forecast.data.currently.temperature = parseFloat(
					weather.forecast.data.current.temp
				).toFixed(0)
				weather.forecast.data.currently.wi =
					"wi-forecast-io-" +
					convert_conditions_to_icon(
						weather.forecast.data.current.weather["0"].description,
						weather.forecast.data.current.sunrise,
						weather.forecast.data.current.sunset,
						"unix"
					)
				break
			//weather.forecast.data.currently.iconAnimation = weather.forecast.data.currently.icon;
		}

		return weather.forecast.data.currently
	}

	weather.weeklyForecast = function (weather) {
		if (weather.forecast === null) {
			return null
		}
		var i = 0
		var datalength = 0
		switch (config.forecast.keytype) {
			case "Darksky":
			case "PirateWeather":
				// Add human readable info to info
				for (i = 0; i < weather.forecast.data.daily.data.length; i++) {
					weather.forecast.data.daily.data[i].day =
						i > 0
							? moment
									.unix(weather.forecast.data.daily.data[i].time)
									.format("ddd")
							: $translate.instant("forecast.today")
					weather.forecast.data.daily.data[i].dt=weather.forecast.data.daily.data[i].time
					weather.forecast.data.daily.data[i].temperatureMin = parseFloat(
						weather.forecast.data.daily.data[i].temperatureMin
					).toFixed(0)
					weather.forecast.data.daily.data[i].temperatureMax = parseFloat(
						weather.forecast.data.daily.data[i].temperatureMax
					).toFixed(0)
					weather.forecast.data.daily.data[i].wi =
						"wi-forecast-io-" + weather.forecast.data.daily.data[i].icon
					weather.forecast.data.daily.data[i].counter = String.fromCharCode(
						97 + i
					)
					weather.forecast.data.daily.data[i].iconAnimation =
						weather.forecast.data.daily.data[i].icon
				}
				break
			case "Climacell":
				// Add human readable info to info
				datalength = min(weather.forecast.timelines[0].intervals.length, 8)

				weather.forecast.data.daily = {}
				weather.forecast.data.daily.data = []
				for (i = 0; i < datalength; i++) {
					weather.forecast.data.daily.data[i] = {}
					weather.forecast.data.daily.data[i].dt=moment
									.utc(
										weather.forecast.timelines[0].intervals[i].startTime,
										"YYYY-MM-DD"
									).valueOf()/1000
					weather.forecast.data.daily.data[i].day =
						i > 0
							? moment
									.utc(
										weather.forecast.timelines[0].intervals[i].startTime,
										"YYYY-MM-DD"
									)
									.format("ddd")
							: $translate.instant("forecast.today")
					weather.forecast.data.daily.data[i].temperatureMin = parseFloat(
						cvttof(
							weather.forecast.timelines[0].intervals[i].values.temperatureMin,
							config.forecast.units
						)
					).toFixed(0)
					weather.forecast.data.daily.data[i].temperatureMax = parseFloat(
						cvttof(
							weather.forecast.timelines[0].intervals[i].values.temperatureMax,
							config.forecast.units
						)
					).toFixed(0)
					weather.forecast.data.daily.data[i].wi =
						"wi-forecast-io-" +
						convert_conditions_to_icon(
							weather.forecast.timelines[0].intervals[i].values.weatherCode,
							null,
							null,
							"utc"
						)
					weather.forecast.data.daily.data[i].counter = String.fromCharCode(
						97 + i
					)
					//weather.forecast.data.daily.data[i].iconAnimation = weather.forecast.data.daily.data[i].icon;
				}
				break
			case "Openweather":
				datalength = min(weather.forecast.data.daily.length, 8)

				//weather.forecast.data.daily={}
				weather.forecast.data.daily.data = []
				for (i = 0; i < datalength; i++) {
					weather.forecast.data.daily.data[i] = {}
					weather.forecast.data.daily.data[i].dt=weather.forecast.data.daily[i].dt

					weather.forecast.data.daily.data[i].day =
						i > 0
							? moment.unix(weather.forecast.data.daily[i].dt).format("ddd")
							: $translate.instant("forecast.today")
					weather.forecast.data.daily.data[i].temperatureMin = parseFloat(
						weather.forecast.data.daily[i].temp.min
					).toFixed(0)
					weather.forecast.data.daily.data[i].temperatureMax = parseFloat(
						weather.forecast.data.daily[i].temp.max
					).toFixed(0)
					weather.forecast.data.daily.data[i].wi =
						"wi-forecast-io-" +
						convert_conditions_to_icon(
							weather.forecast.data.daily[i].weather[0].description,
							weather.forecast.data.daily[i].sunrise,
							weather.forecast.data.daily[i].sunset,
							"unix"
						)
					weather.forecast.data.daily.data[i].counter = String.fromCharCode(
						97 + i
					)
				}
				break
		}
		return weather.forecast.data.daily
	}

	weather.hourlyForecast = function (weather) {
		if (weather.forecast === null) {
			return null
		}
		switch (config.forecast.keytype) {
			case "Darksky":
			case "PirateWeather":
				weather.forecast.data.hourly.day = moment
					.unix(weather.forecast.data.hourly.data[0].time)
					.format("ddd")
				break
			default:
				weather.forecast.data.hourly.day = moment
					.unix(weather.forecast.data.hourly[0].dt)
					.format("ddd")
		}
		return weather.forecast.data.hourly
	}

	GeolocationService.getLocation({ enableHighAccuracy: true }).then(function (
		geopo
	) {
		geoposition = geopo
		refreshWeatherData(geoposition)
		$interval( ()=>{
			refreshWeatherData(geoposition)
			},
			config.forecast.refreshInterval * 60000 || 7200000
		)
	})

	function refreshWeatherData(geoposition) {
		config.forecast.keytype = (config.forecast.keytype + " ").split(" ")[0]
		config.forecast.key = config.forecast.key.trim()
		// map location to country for auto weather units (if needed)
		WeatherService.getCountry(geoposition).then(() => {
			// get the weather info
			WeatherService.get[config.forecast.keytype](geoposition).then(
				(weather_data) => {
					// set the current forecast info for index.html usage
					$scope.currentForecast = weather.currentForecast(weather_data)
					// set the weekely forecast info for index.html usage
					$scope.hourlyForecast=null
					$scope.minutelyForecast=null
					$scope.weeklyForecast = weather.weeklyForecast(weather_data)
					if (config.forecast.keytype != "Climacell") {
						// we don't have hourly
						$scope.hourlyForecast = weather.hourlyForecast(weather_data)
						if (config.forecast.keytype == "Darksky") {
							// or minutely anymore
							$scope.minutelyForecast = weather.minutelyForecast(weather_data)
						}
					}
					$rootScope.$broadcast('weather', {
								current:$scope.currentForecast,
								weekly:$scope.weeklyForecast,
								hourly:$scope.hourlyForecast,
								minutely:$scope.minutelyForecast
							});
				},
				function (err) {
					console.log(err)
				}
			)
		})
	}

	function convert_conditions_to_icon(value, sunrise, sunset, type) {
		var icon_name = ""
		switch (value) {
			case "ice_pellets_heavy":
			case 7202:
				//wi-forecast-io-hail: hail
				icon_name = "hail"
				break
			case "freezing_rain_heavy":
			case 6201:
			case "freezing_rain":
			case 6001:
			case "freezing_rain_light":
			case 6200:
			case "freezing_drizzle":
			case 6000:
			case "ice_pellets":
			case 7000:
			case "ice_pellets_light":
			case 7201:
				// wi-forecast-io-sleet: sleet
				icon_name = "sleet"
				break
			case "snow_heavy":
			case 5101:
			case "snow":
			case 5000:
			case "snow_light":
			case 5100:
			case "flurries":
			case 5001:
				//wi-forecast-io-snow: snow
				icon_name = "snow"
				break
			case "tstorm":
			case 8000:
				//wi-forecast-io-thunderstorm: thunderstorm
				icon_name = "thunderstorm"
				break
			case "rain_heavy":
			case 4201:
			case "rain":
			case 4001:
			case "rain_light":
			case 4200:
			case "very heavy rain":
			case "heavy intensity rain":
			case "light rain":
			case "moderate rain":
				// wi-forecast-io-rain: rain
				icon_name = "rain"
				break
			case "fog_light":
			case "fog":
			case 2000:
			case 2100:
				//wi-forecast-io-fog: fog
				icon_name = "fog"
				break
			case 1001:
				case "cloudy":
				case "overcast clouds":
					//wi-forecast-io-cloudy: cloudy
					icon_name = "cloudy"
				break

			case 1102:
			case "mostly_cloudy":
				icon_name = "mostly-cloudy"
				break;
			case 1101:
			case "scattered clouds":
			case "broken clouds":
			case "drizzle":
			case 4000:
				//wi-forecast-io-partly-cloudy-day: day-cloudy
				//wi-forecast-io-partly-cloudy-night: night-cloudy
				icon_name = "partly-cloudy"
				break
			case "mostly_clear":
			case 1100:
			case "clear sky":
			case "clear day":
			case "few clouds":
			case "clear":
			case 1000:
				//wi-forecast-io-clear-day: day-sunny
				//wi-forecast-io-clear-night: night-clear
				icon_name = "clear"
				break
			default:
		}
		if (icon_name == "clear" || icon_name == "partly-cloudy") {
			if (sunrise !== undefined && sunrise !== null) {
				var m = moment()
				var sunrise_moment = null
				var sunset_moment = null
				if (type == "unix") {
					sunrise_moment = moment.unix(sunrise)
					sunset_moment = moment.unix(sunset)
				} else {
					sunrise_moment = moment.utc(sunrise)
					sunset_moment = moment.utc(sunset)
				}
				if (m.isAfter(sunrise_moment) && m.isBefore(sunset_moment))
					icon_name += "-day"
				else icon_name += "-night"
			} else icon_name += "-day"
		}

		return icon_name

		/*
			wi-forecast-io-wind: strong-wind
			wi-forecast-io-tornado: tornado */
	}
}

angular.module("SmartMirror").controller("Weather", Weather)
