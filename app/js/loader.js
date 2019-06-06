
const fs = require('fs');
var pos = require('./plugin_positions.js')()
const cheerio = require('cheerio')

const debug = false;
// new output html filename
const new_file = 'main_index.html';
// plugin folder name
const plugin_folder_name ='plugins';
// important plugin files
const controller_name='controller.js'
const html_name='index.html'
const service_name='service.js'
const css_name='plugin.css'

var loader = {};
var locations={};

var filesList= [html_name,service_name,controller_name,css_name];
var pluginFiles = {}

if(debug) {console.log(" in plugin loader")}
function NameinFilter(filters,name){
	let v=null;
	for( let n of filters){
		if(name.endsWith(n)){
			v=n;
			break; 
		}
	}
	return v;
}
// get files in path that match filters (if specified)
function getFilesMatch (dir,filters, files_){
	files_ = files_ || {};
	let files = fs.readdirSync(dir);
		for (let f of files){
			let name = dir + '/' + f;
			try {
				if (fs.statSync(name).isDirectory()){
					getFilesMatch(name, filters, files_);
				} else {
					// if not a nested node folder
					if(name.indexOf("node_modules") == -1){
						// see if this file is one we are interested in
						let key=NameinFilter(filters,name)
						// if so
						if(key){
							// save it
							files_[key].push(name);
						}
					}
				}
			}
			catch(exception)
			{ console.log(" exception="+exception)}
		}
	return files_;
}


function loadInfo (){

	// build hash table for results, single pass
  pluginFiles = {};
  for( let f of filesList){
    pluginFiles[f]=[]
  }
	if(debug) {console.log(" searching for plugin files")}
	// only go thru drectory tree once	
	pluginFiles = getFilesMatch (plugin_folder_name,filesList,pluginFiles)
	if(debug) {console.log("plugin files ="+JSON.stringify(f1));}

}
function insert_services($){

	$('body').append('\n<!--- Services -->\n');
	for(let s of pluginFiles[service_name]){
		let ss = "<script src=\""+s+"\"></script>\n"
		$('body').append(ss)
	}
}

function insert_controllers($){
	$('body').append('\n<!--- Controllers -->\n');
	let ss = "<script src=\"app/js/controller.js\"></script>\n"
	$('body').append(ss)
	for(let c of pluginFiles[controller_name]){
		ss = "<script src=\""+c+"\"></script>\n"
		$('body').append(ss)
	}
}
function insert_css($){
	for(let c of pluginFiles[css_name]){
		ss = "<link rel=\"stylesheet\" href=\""+c+"\"/>\n"
		$('head').append(ss)
	}
}

 // updates the app index.html with discovered plugin info
loader.loadPluginInfo = function(filename, config){
		
		if(config.plugins === undefined){
			if(debug){console.log("changing to stock location info");}
			config.plugins=pos;
		}
		if(debug) {console.log("in loadinfo, config.plugins="+JSON.stringify(config.plugins)); }		
		// find all the plugins and their files
		loadInfo();
		// read the index.html file template, as json object
		let $= cheerio.load(fs.readFileSync(filename));
		let id_div = "";

		// add entries for css to head
		insert_css($)

		// order matters, services must be first, as controllers will use them
		// add entries for services to body
		insert_services($)
		// add entries for controllers to body
		insert_controllers($)
	 // order matters

		// loop thru all the index.html files found
		for(let h of pluginFiles[html_name]){
			// get the plugin name
			if(debug)	{console.log("looking for plugin="+h)}
			// get the plugin name
			let plugin_name = h.substring(h.indexOf("/")+1, h.lastIndexOf("/"))
			id_div="";
		 if(debug){ console.log("plugin name="+plugin_name)}

			// make the html to insert
			id_div += "\n<div ng-include=\"'"+h+"'\"></div>"

			if(debug){ console.log(" plugin info for "+plugin_name+"="+id_div)}

			// default position
			let page_location = 'bottom-center'
			// was this plugin added
			let added = false;
			// loop thru the module position info
			for(let p of config.plugins){
				// if the config name is the same as this module
				if(debug) {console.log(" h entry="+h +	" name="+p.name)}
				if(h.indexOf(p.name)>=0){
					// get the area div location
					page_location = p.area
					// first time we've seen this area?
					if(locations[page_location] == undefined){
						// create object to hold items
						locations[page_location]={items:[], delayed:[]}
					}
					if(debug) {console.log(page_location+" length="+locations[page_location].items.length)}
					// if the position ordering is 'any'
					if(p.order =='*') {
						if(debug) {console.log(" place anywhere")}
						// append it
						locations[page_location].delayed.push(id_div)
					}
					// if needs to be first
					else if(p.order == 1){
						if(debug) {console.log(" place 1st")}
						// prepend it
						locations[page_location].items.unshift(id_div)
					}
					// has some other position, greater than 1
					else{
						// if there are already more than 1 entry
						if(debug) {console.log(" place in position\n count = "+locations[page_location].items.length +" pos="+p.order)}
						// if more already than this one
						if(locations[page_location].items.length> p.order){
							if(debug) {console.log(" more than 1")}
							// splice it in where it belongs
							locations[page_location].items.splice((p.order+0),id_div)
						} else {
							if(debug) {console.log(" adding to the end")}
							// add it to the end
							locations[page_location].items.push(id_div)
						}
					}
					// indicate added
					added=true;
					break
				}
			}
			// if not added (no position info)
			if(added==false){
				// locate the default location
				let d=$("div."+page_location)
				// put this module there
				// if alresady something in this div
				// put our stuff in front
				// length is not updated while we are running
				d.append(id_div)
			}
		}
		// defered adds because jquery caches the elements til this script ends
		for(let v of Object.keys(locations)){
			let d=$("div."+v)
			for(let e of locations[v].items){
				if(d.length>0){
					d.prepend(e)
				}
				else{
					d.append(e)
				}
			}
			for(let e of locations[v].delayed){
				if(d.length>0){
					d.prepend(e)
				}
				else{
					d.append(e)
				}
			}
		}
		// get the new html
		let x = $.html();
		//if(debug) console.log("new html = "+ x)
		try {
			// write it to the new file
			fs.writeFileSync(new_file, x)
		}
		catch(error) {
			console.log(error)
		}
		// clear html object storage. no longer needed
		$=''
    pluginFiles={};
		// pass back the new file to load
		return '/'+ new_file;
}

module.exports = loader