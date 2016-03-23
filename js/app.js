// Warn the user if they have not filled out config.js or if it has an error
if(typeof config == 'undefined'){
    alert("'config.js' is missing or contains an error!");
}

// Load localization files
document.write('\x3Cscript src="locales/' + config.language + '.js">\x3C/script>');

// Bootstrap Angular
(function(angular) {
    'use strict';

    angular.module('SmartMirror', ['ngAnimate', 'tmh.dynamicLocale']).config(function(tmhDynamicLocaleProvider) {
        var locale = config.language.toLowerCase();
        tmhDynamicLocaleProvider.localeLocationPattern('bower_components/angular-i18n/angular-locale_' + locale + '.js');
    });

}(window.angular));