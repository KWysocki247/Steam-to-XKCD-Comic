/*
=-=-=-=-=-=-=-=-=-=-=-=-
Xkcd Comic Finder
=-=-=-=-=-=-=-=-=-=-=-=-
Comment (Required):
This code creates a localhost server on port 3000 and when a user connects in ask to enter a steam id.
When the steam id is entered, we make a GET request to the steam api to get the steam users public information.
We then get the time created, we get a comic number and then send a request to the xkcd api.
We then get the comic, save it, and display it to the user.

=-=-=-=-=-=-=-=-=-=-=-=-
*/

const https = require('https');
const http = require('http');
const port = 3000;
const server = http.createServer();
const fs = require("fs");
const url = require('url'); 
const querystring = require('querystring');
const credentials = require('./key/credentials.json');
const APIkey = credentials.key;
const cache = ('./cache/');
let comicNum;

server.on("request", connection_handler); //when a request is made by a user
function connection_handler(req, res){
	if(req.url === "/"){ //if they access the root of the website, display main.html and give them a form to fill out
		console.log(`New Request for ${req.url} from ${req.socket.remoteAddress }`);
		const main = fs.createReadStream('html/main.html');
		res.writeHead(200, {'Content-Type':'text/html'});
		main.pipe(res);
	}
	else if(req.url === "/favicon.ico"){ //if they access the favicon.ico then it displays the favicon
		console.log(`New Request for ${req.url} from ${req.socket.remoteAddress}`);
		const favicon = fs.createReadStream("./pictures/favicon.ico");
		res.writeHead(200, {'Context-Type':'image/x-icon'});
		favicon.pipe(res);
	}
	else if(req.url === "/images/banner.jpg"){ //if they access /image/banner.jpg display the banner 
		console.log(`New Request for ${req.url} from ${req.socket.remoteAddress}`);
		const banner = fs.createReadStream("./pictures/banner.jpg");
		res.writeHead(200, {'Context-Type':'image/jpeg'});
		banner.pipe(res);
	}
	else if(req.url.startsWith('/search')){ //if the user makes a search request 
		console.log(`New Request for ${req.url} from ${req.socket.remoteAddress}`);
		let urlAddress = url.parse(`${req.url}`, true); //parse the url and turn it into an object
		if(isNaN(urlAddress.query.steamids)){ //if what the user inputed was not a number, send a 404 error that the user did not enter a proper steam id
			res.writeHead(200, {'Context-Type':'text/plain'});
			console.log("ERROR 404 - YOU DID NOT ENETER A PROPER STEAMID");
			res.write("ERROR 404 - YOU DID NOT ENETER A PROPER STEAMID");
			res.end();
		}
		else{
			let steamids = urlAddress.query.steamids; //get the number that the user inputed
			getSteamData(steamids, res); //call getSteamData
		}
	}
	else{ //if the user tries to access a webpage that is not implemented send a 404 error page not found
		console.log(`New Request for ${req.url} from ${req.socket.remoteAddress}`);
		res.writeHead(200, {'Context-Type':'text/plain'});
		console.log("ERROR 404 - PAGE NOT FOUND");
		res.write("ERROR 404 - PAGE NOT FOUND");
		res.end();
	}
}

const getSteamData = function(steamids, res){ //sends a GET request to the steam api to return a JSON file of the player summary relating to the steam id entered 
	const steam_endpoint = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${APIkey}&steamids=${steamids}`;
	https.request(steam_endpoint, {method:"GET"}, Steaminformation)
		.end();
	function Steaminformation(stream){ //the JSON file is sent it chunks so we append all the chunks of data to data
		let data = "";
		stream.on("data", chunk => data += chunk);
		stream.on("end", () => Steamresults(data, res)); //when there is no more information being sent, we call Steamresults
	}
}

const Steamresults = function(data, res){ //We parse the JSON file that we sent to us by calling the steam API
	let steamUser = JSON.parse(data); ////parse the JSON file into a javascript object so we may access the data inside of it
	console.log(steamUser.response.players); //shows us the information that we are working with
	if(steamUser.response.players.length === 0){ //if the number that the user entered is not connected to a steam id, send a 404 error saying that they steam id is not correct 
		res.writeHead(200, {'Context-Type':'text/plain'});
		console.log("ERROR 404 - YOU DID NOT ENETER A PROPER STEAMID");
		res.write("ERROR 404 - YOU DID NOT ENETER A PROPER STEAMID");
		res.end();
	}
	else {
		let userArray = steamUser.response.players[0].timecreated; //else get the time the account was created and call getComic
		getComic(res, userArray);
	}
}
	
const getComic = function(res, userArray){
	comicNum = userArray % 2000; //get a comic number by mod 2000 of the time created 
	console.log(comicNum);
	const xkcd_endpoint = `https://xkcd.com/${comicNum}/info.0.json`; //send a GET request to the xkcd api to return a JSON file of the data of the comic
	https.request(xkcd_endpoint, {method:"GET"}, Xkcdinformation)
		.end();
	function Xkcdinformation(streams){ //the JSON file is sent it chunks so we append all the chunks of data to data
		let data = "";
		streams.on("data", chunk => data += chunk);
		streams.on("end", () =>	Xkcdresults(data, res)); //when there is no more data being sent over call Xkcdresults
	}
}	
	
const Xkcdresults = function(data, res){ 
	let comicParse = JSON.parse(data); //parse the JSON file into a javascript object so we may access the data inside of it
	let comicURL = comicParse.img; //get the url to the image
	let title = comicParse.title; //get the title of the image
	let filename = `${cache}${title}.png`; //gets the path that will be where the comic is saved 
	if(fs.existsSync(filename)){ //if the comic has already been saved, show the comic and don't send another request to the XKCD API
		console.log("IT'S CACHED"); 
		res.writeHead(200, {"Content-Type":"image/png"}); 
		let comic = fs.createReadStream(filename); //reads the comic from our cached pictures 
		comic.pipe(res); //displays to the user the cached comic
	}
	else{
		let requestComic = https.get(comicURL, function(downloadComic){ //GET request to the comicURL that will allow us to download the comic
			let newComic = fs.createWriteStream(cache+title+".png", {'encoding' :null}); //opens a write stream to our cache folder 
			console.log("New comic - had to download it");
			downloadComic.pipe(newComic); //downloads the comic to our cache folder 
			displayComic(downloadComic, res); //cals displayComic 
		});
		requestComic.on('error', function(err){
			console.log(err)
		});
	}
}

const displayComic = function(downloadComic, res){ //displays the downloaded comic to the user on the website
	res.writeHead(200, {"Content-Type":"image/png"});
	downloadComic.pipe(res);
}

server.on("listening", listening_handler);
server.listen(port);
function listening_handler(){
	console.log(`Now Listening on Port ${port}`);
}
