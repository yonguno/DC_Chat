var io = require('socket.io'),
	express = require('express'),
	fs = require('fs'),
	parseCookie = require('connect').utils.parseCookie;
	app = express.createServer();

app.configure(function(){
	app.use(express.cookieParser());
	app.use(express.session({secret:'secret',key:'dragon.sid'}));
	app.use(function(req,res){
		fs.readFile(__dirname+'/index.html',function(err,data){
			if(err){
				res.writeHead(500);
				return res.end('Error load socket.html');
			}
			res.writeHead(200);
			res.end(data);
		});
	});
});
var text = new Array(10);
function log(str){
	for(var i=0;i<9;i++){
		text[i] = text[i+1];
	}
	text[9] = str;
}
var users = {};
var sessions = {};
var connections = {};
app.listen(2020);
var sio=io.listen(app);
sio.set('authorization',function(data,accept){
	if(data.headers.cookie){
		data.cookie = parseCookie(data.headers.cookie);
		data.sessionID=data.cookie['dragon.sid'];
	}else{
		return accept('No cookie transmitted.',false);
	}
	accept(null,true);
});
sio.sockets.on('connection',function(socket){
	sessionID = socket.handshake.sessionID;
	if(connections[sessionID]){
		socket.emit('news',{msg:'You have duplicated connections.'});
		return socket.disconnect();
	}else{
		connections[sessionID] = true;
	}
	console.log(""+sessionID+" connected!");
	if(sessions[sessionID]){
		username = sessions[sessionID];
		while(users[username]!=undefined){
			username = "중복_"+username;
		}
		sessions[sessionID] = username;
	}else{
		var username = "";
		do{
			username = "손님_"+Math.floor(Math.random()*10000);
		}while(users[username]!=undefined);
		sessions[sessionID] = username;
	}
	socket.emit('name',{name:username});
	users[username] = socket; 
	if(text[9]!=undefined){
		var logs = "";
		for(var i=0;i<10;i++){
			if(text[i]!=undefined)
				socket.emit('news',{msg:text[i]});
		}
	}
	userlist = "";
	for(user in users){userlist += user+"<br>"};
	sio.sockets.emit('users',{users:userlist});
	socket.on('msg',function(data){
		log(username+":"+data.msg);
		sio.sockets.emit('news',{msg:username+":"+data.msg});
	});
	socket.on('name',function(data){
		prevName=username;
		delete users[username];
		username = data.name;
		while(users[username]!=undefined){
			username = "중복_"+username;
		}
		users[username] = socket;
		sessions[sessionID] = username;
		socket.emit('name',{name:username});
		log(prevName+"->"+username);
		sio.sockets.emit('news',{msg:prevName+"->"+username});
		userlist = "";
		for(user in users){userlist +=user+'<br />';}
		sio.sockets.emit('users',{users:userlist});
	});
	socket.on('disconnect',function(){
		delete users[username];
		connections[sessionID] = false;
		userlist = "";
		for(user in  users){userlist +=user+'<br />';}
		sio.sockets.emit('users',{users:userlist});
	});
});
