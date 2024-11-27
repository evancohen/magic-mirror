// Bootstrap Angular
(function (angular) {
	"use strict";

	var language =
		typeof config.general.language != "undefined"
			? config.general.language.substring(0, 2).toLowerCase()
			: "en";
	angular
		.module("SmartMirror", [
			"ngAnimate",
			"tmh.dynamicLocale",
			"pascalprecht.translate",
			require("angular-sanitize"),
		])
		.config(function (tmhDynamicLocaleProvider) {
			console.log(config);
			tmhDynamicLocaleProvider.localeLocationPattern(
				"node_modules/angular-i18n/angular-locale_" +
					language +
					".js"
			);
		})

		.config([
			"$translateProvider",
			function ($translateProvider) {
				$translateProvider
					.uniformLanguageTag("bcp47")
					.useStaticFilesLoader({
						prefix: "app/locales/",
						suffix: "c.json",
					});
				$translateProvider.useSanitizeValueStrategy(null);
				// Avoiding the duplicity of the locale for the default language, xx-YY -> xx
				// We are considering only the language
				// Please refer https://github.com/evancohen/smart-mirror/pull/179 for further discussion
				var language =
					typeof config.general.language != "undefined"
						? config.general.language.substring(0, 2)
						: "en";
				$translateProvider.preferredLanguage(language);
			},
		])

		.config([
			"$sceDelegateProvider",
			function ($sceDelegateProvider) {
				$sceDelegateProvider.resourceUrlWhitelist([
					"self",
					"https://www.youtube.com/embed/**",
				]);
			},
		]);
})(window.angular);
