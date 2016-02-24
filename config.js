var config = {
    // Lenguage for the mirror (currently not implemented)
    lenguage : "nl",
    greeting : ["Hallo, Jeffrey!"], // An array of greetings to randomly choose from
    // forcast.io
    forcast : {
        units : "si" // See forcast.io documentation if you are getting the wrong units
    },
    // Philips Hue
    hue : {
        ip : "", // The IP address of your hue base
        uername : "", // The username used to control your hue
        group : "0", // The group you'd like the mirror to control (0 is all hue lights connected to your hub)
    },
    // Calendar (An array of iCals)
    calendar: {
      maxResults: 6, // Number of calender events to display (Defaults is 9)
      maxDays: 60 // Number of days to display (Default is one year)
    },
    // Giphy
    giphy: {
      key : "" // Your Gliphy API key
    },
    traffic: {
      key : "", // Bing Maps API Key
      mode : "Driving", // Possibilities: Driving / Transit / Walking
      origin : "", // Start of your trip. Human readable address.
      destination : "", // Destination of your trip. Human readable address.
      name : "work", // Name of your destination ex: "work"
      reload_interval : 5 // Number of minutes the information is refreshed
    },
    todo: {
      list : "", //https://todoist.com/API/getUncompletedItems?project_id=PROJECT_ID_HERE&token=API_KEY_HERE
      key : "", //Todoist API_KEY
      project : "" //Todoist PROJECT_ID
    }
}
