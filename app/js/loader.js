
const fs = require('fs');
//var pos = require('./plugin_positions.js')()
const cheerio = require('cheerio')

const debug = false;
const _ = require('lodash')

// new output html filename
const new_file = 'main_index.html';
// plugin folder name
const plugin_folder_name ='plugins';
// important plugin files
const controller_name='controller.js'
const html_name='index.html'
const service_name='service.js'
const css_name='plugin.css'
const locale_name ='.json'

var loader = {};
var locations={};

var filesList= [html_name,service_name,controller_name,css_name,locale_name];
var pluginFiles = {}
var base_language_files = {}
base_language_files[locale_name]=[]

if(debug) {console.log(" in plugin loader")}
function NameinFilter(filters,name){
	let v=null;
	for( let n of filters){
		if( (name.endsWith(n) && !name.endsWith("c"+n)) || ((name.endsWith(n) && !name.endsWith("c"+n)) && n ==locale_name && name.includes('locales/'))
		  ){
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
				// don't scan the plugin node_modules folder
				if(name.indexOf("node_modules") == -1 && name.indexOf("bower_components")==-1 && name.indexOf("save")==-1){
					getFilesMatch(name, filters, files_);
				}
			} else {
				// if not a nested node folder
				if(name.indexOf("node_modules") == -1 && name.indexOf("schema") == -1){
					// see if this file is one we are interested in
					let key=NameinFilter(filters,name)
					// if so
					if(key){
						if(debug)
							console.log("saving file found for key="+key+" name="+name)
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
	if(debug) {console.log("plugin files ="+JSON.stringify(pluginFiles));}
	base_language_files = getFilesMatch('app',[locale_name],base_language_files);
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
		let ss = "<link rel=\"stylesheet\" href=\""+c+"\"/>\n"
		$('head').append(ss)
	}
}
// make sure to remove plugin controller, service and css entries too if disabled
function cleanup(plugin_name){
	var names= [service_name,controller_name,css_name,locale_name];
	var deletelist=[]
	for(var name of names){
		for(var i=0 in pluginFiles[name]){
			console.log("cleanup looking for "+plugin_name+" in "+pluginFiles[name][i])
			if(pluginFiles[name][i].toLowerCase().includes(plugin_name.toLowerCase())){						
				if(name!==locale_name){	
					if(debug)
						console.log("removing "+name+" entry for i="+i+" "+pluginFiles[name][i])
					pluginFiles[name].splice(i,1)				
					break;
				}
				else{
					// can't delete from the list while we are searching it
					// save index, in reverse order for delete later
					deletelist.unshift(i)
				}
			}
		}
	}
	// if we have stuff to delete
	if(deletelist.length>0){
		// do it, depends on changing later in the array before earlier
		for(var i of deletelist){
			console.log("deleteing "+ pluginFiles[locale_name][i])
			pluginFiles[locale_name].splice(i,1)
		}
	}

}

// updates the app index.html with discovered plugin info
loader.loadPluginInfo = function(filename, config){
	let configDefault=null;
	if(config.plugins === undefined){
		try {
			let path=__dirname+'/../../remote/.config.default.json'
			configDefault = JSON.parse(fs.readFileSync(path, "utf8"))
		}
		catch(error){
			console.log("unable to locate default config="+error)
		}
		config.plugins=configDefault.plugins;
		configDefault=null
	}
	if(debug) {console.log("in loadinfo, config.plugins="+JSON.stringify(config.plugins)); }
	// find all the plugins and their files
	loadInfo();
	// read the index.html file template, as json object
	let $= cheerio.load(fs.readFileSync(filename));
	let id_div = "";

	// order matters
	let plugin_hash ={}
	// convert array to hash for quick lookup
	config.plugins.forEach((entry)=>{
		plugin_hash[entry.name.trim().toLowerCase()]=entry
	})

	// loop thru all the index.html files found
	for(let h of pluginFiles[html_name]){
		// get the plugin name
		if(debug)	{console.log("\nlooking for plugin="+h)}
		// get the plugin name
		let plugin_name = h.substring(h.indexOf("/")+1, h.lastIndexOf("/"))
		id_div="";
		if(debug){ console.log("plugin name="+plugin_name)}

		// make the html to insert
		id_div += "\n<div ng-include=\"'"+h+"'\"></div>"

		if(debug){ console.log(" plugin info for "+plugin_name+"="+id_div+"\n")}

		// default position
		let page_location = 'bottom-center'
		// was this plugin added
		let added = false;
		// get the config info for this plugin,
		let p = plugin_hash[plugin_name.trim().toLowerCase()]
		// if already set or default
		if(p){
			if(debug) {console.log(" h entry="+h +	" name="+p.name)}
			if(p.active == undefined ||
				p.active == true){
				if(debug) {
					console.log("plugin "+ p.name+ " is active=" + p.active)
				}
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
					if(locations[page_location].items.length>= p.order){
						if(debug) {console.log(" more than 1")}
						// splice it in where it belongs
						let insert_index = parseInt( p.order) -1;
						locations[page_location].items.splice(insert_index,0,id_div)
						if(debug) {console.log("insert_index="+insert_index+ " list="+JSON.stringify(locations[page_location].items))}
					} else {
						if(debug) {console.log(" adding to the end")}
						// add it to the end
						locations[page_location].items.push(id_div)
					}
				}
				// indicate added
				added=true;
			}
			else {
				if(debug) {
					console.log("plugin "+ p.name +" is NOT active=" + p.active)
				}
				// make sure not to load plugin's controller or service
				cleanup(p.name)
				added=true;
			}
		}

		// if not added (no position info)
		if(added==false){
			if(debug) {console.log("not yet added"+id_div)}
			// locate the default location
			let d=$("div."+page_location)
			// put this module there
			if(d)
			{d.append(id_div)}
			else{
				if(debug) {console.log("not yet added, location not found"+id_div)}
			}
		}
	}
	// defered adds because jquery caches the elements til this script ends
	for(let v of Object.keys(locations)){
		let d=$("div."+v)
		if(debug) {console.log("processing for location="+v +" d length="+d.children().length+" items="+JSON.stringify(locations[v].items))}
		let existing_children=d.children().length
		for(let e of locations[v].items){
			if(debug) {console.log("items ="+e)}
			if(existing_children>=1){
				d.prepend(e)
			}
			else{
				d.append(e)
			}
		}
		for(let e of locations[v].delayed){
			if(debug) {console.log("delayed ="+e)}
			if(existing_children>0){
				d.append(e)
			}
			else{
				d.append(e)
			}
		}
	}
	// add entries for css to head
	insert_css($)

	// order matters, services must be first, as controllers will use them
	// add entries for services to body
	insert_services($)
	// add entries for controllers to body
	insert_controllers($)	
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
	//
	// loop thru the locale files found in app/locales
	for(var base of base_language_files[locale_name]){		
		// get the base as an object 
		var bdata = JSON.parse(getfilecontents(base));
		if(debug)
 			console.log("processing base locale file="+base)
 		// loop thru the plugin locale file segments
		for( var la of pluginFiles[locale_name]){
			// get the file name
			var l = la.split('/').slice(-1).toString()
			var r= base.split('/').slice(-1).toString()
			if(debug)
				console.log("comparing l='"+l+"' with '"+r+"'=r")
			// if they match
			if(l == r ){
				if(debug)
					console.log("matching language file="+ la)
				// get its content, if any
				var b =  getfilecontents(la)
				// if the file is curently empty, skip it
				if(b !=''){ 	
					try {	// don't let a fragment parsing error kill file creation		
						// parse the content
						x =  JSON.parse(b);
						// and merge it into combined result
						// not Object.assign overlays existing, not merge
						// use lodash
						_.merge( bdata, x);
					}
					catch(error){
						console.log(" unable to parse "+la+ " content="+b)
					}
				}				
			}
		}
		// check for any commands to add to the end of the list, so they don't pollute the what can I say list
		if(bdata.commandsend !==undefined){
			// add then at the end of the commands list
			for(var f of Object.keys(bdata.commandsend)){
				bdata.commands[f]=bdata.commandsend[f]
			}
			// remove it from the runtime data
			delete bdata.commandsend 
		}
		if(debug)
			console.log("merged data for file="+base +"="+JSON.stringify(bdata))
		// construct the filename for the constructed locale file
		var basefn=base.split('/')
		var basename = basefn.slice(-1).toString().split('.')
		// add a 'c' to the lanugage d (en->enc)
		basename[0]+='c'
		basename=basename.join('.')
		basefn.pop()
		basefn.push(basename)
		basefn=basefn.join('/')
		if(debug)
			console.log(" new base filename="+basefn)
		// write out the constructed locale file
		fs.writeFileSync(basefn,JSON.stringify(bdata))
	}
	// clear the data collected about files
	pluginFiles={};
	// pass back the new file to load
	return '/'+ new_file;
}
function getfilecontents(file){
	try {
		var x = fs.readFileSync(file)
		var y=x.toString()
		//if(debug)
			//console.log("file contents for file ="+file +" = '"+ y+"'")
		if(y[0]!=='{')
			return y.substring(1)
		else
			return y;
	}
	catch(error){
		return '{}'
	}
}

module.exports = loader
