const __rm = require("path");
let __rmpath = document.currentScript.src.substring(
	7,
	document.currentScript.src.lastIndexOf(__sp.sep)
);

function Reminder($scope, SpeechService, $translate, Focus) {
	const storage = require("electron-json-storage");
	storage.setDataPath(__rmpath);
	// Service variable
	var remind = {};
	remind.reminders = [];
	// Flag to check if reminders list is empty
	storage.empty = true;

	// Need to use the callback function because when the service is initialize,
	// the translation service is not set up.
	$translate("reminders.empty").then(function (translation) {
		remind.empty = translation;
	});
	$translate("reminders.heading").then(function (translation) {
		remind.heading = translation;
	});
	//}
	// Check if reminder storage already exists
	storage.has("sm-reminder", function (error, hasKey) {
		if (error) throw error;
		if (hasKey) {
			// Flag to check if reminders list is empty

			storage.get("sm-reminder", function (error, data) {
				if (error) throw error;
				remind.reminders = data.reminders;
			});
		}
	});

	// Insert a new task in the reminder list.
	remind.insertReminder = function (remindMe) {
		/*		if (remind.empty) {
			// If the list is empty, clear the reminders array because it contains the default empty task
			remind.reminders = [];
			// Pass the flag to false
			remind.empty = false;
		} */
		// Push the new task to reminders list
		remind.reminders.push(remindMe);
		storage.set("sm-reminder", { reminders: remind.reminders }, function (
			error
		) {
			if (error) throw error;
		});
		return remind; // .reminders;
	};

	// Clear the reminders list and set the empty flag to true
	remind.clearReminder = function () {
		remind.reminders = [];
		storage.remove("sm-reminder", function (error) {
			if (error) throw error;
		});
		return remind; // .reminders;
	};

	// Return the reminders list
	remind.getReminders = function () {
		return remind; // .reminders;
	};

	remind.empty = true;

	// Set a reminder
	SpeechService.addCommand("reminder_insert", function (task) {
		$scope.remind = remind.insertReminder(task);
		Focus.change("reminders");
	});

	// Clear reminders
	SpeechService.addCommand("reminder_clear", function () {
		$scope.remind = remind.clearReminder();
		Focus.change("default");
	});

	// Clear reminders
	SpeechService.addCommand("reminder_show", function () {
		$scope.remind = remind.getReminders();
		Focus.change("reminders");
	});
}

angular.module("SmartMirror").controller("Reminder", Reminder);
