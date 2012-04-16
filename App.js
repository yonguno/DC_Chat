var app = require('http').createServer(handler)
	, io = require('socket.io').listen(app)
	, fs = require('fs');

app.listen(2020);
function handler(req,res){
	fs.readFile(__dirname + '/index.html',
	function(err,data){
		if(err){
			res.writeHead(500);
			return res.end('Error loading index.html');
		}

		res.writeHead(200);
		res.end(data);
	});
}
var text = new Array(10);
function log(str){
	for(var i=0;i<9;i++){
		text[i] = text[i+1];
	}
	text[9] = str;
}
var users = {};
var sockets = {};
io.sockets.on('connection',function(socket){
	var username = "";
	do{
		username = "손님_"+Math.floor(Math.random()*10000);
	}while(users[username]!=undefined);
	socket.emit('name',{name:username});
	users[username] = socket; 
	sockets[socket] = username;
	if(text[9]!=undefined){
		var logs = "";
		for(var i=0;i<10;i++){
			if(text[i]!=undefined)
				socket.emit('news',{msg:text[i]});
		}
	}
	userlist = "";
	for(user in users){userlist += user+"<br>"};
	io.sockets.emit('users',{users:userlist});
	socket.on('msg',function(data){
		log(username+":"+data.msg);
		io.sockets.emit('news',{msg:username+":"+data.msg});
	});
	socket.on('name',function(data){
		prevName=username;
		delete users[username];
		username = data.name;
		while(users[username]!=undefined){
			username = "중복_"+username;
		}
		users[username] = socket;
		socket.emit('name',{name:username});
		log(prevName+"->"+username);
		io.sockets.emit('news',{msg:prevName+"->"+username});
		userlist = "";
		for(user in users){userlist +=user+'<br />';}
		io.sockets.emit('users',{users:userlist});
	});
	socket.on('disconnect',function(){
		delete users[username];
		delete sockets[socket];
		userlist = "";
		for(user in  users){userlist +=user+'<br />';}
		io.sockets.emit('users',{users:userlist});
	});
});
