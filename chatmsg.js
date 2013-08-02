function onChatInterest(inst){
//need msgcache
    console.log('Chat Interest received in callback.');
    console.log(inst.name.to_uri());
    var content = {};
    var seq = parseInt(DataUtils.toString(inst.name.components[5]));/////
    console.log("seq");
    console.log(seq)
    for(var i = msgcache.length-1;i>=0;i--){
	//console.log("msgseq:"+msgcache[i].seqno);
        if(msgcache[i].seqno ==seq){
            content = {msg:msgcache[i].msg,type:msgcache[i].msgtype,time:msgcache[i].time};
            JSON.stringify(content);
            break;
        }
    }
    console.log("msg find:");
    console.log(content);
    if(content.msg != null){
	var str = JSON.stringify(content);
	var co = new ContentObject(inst.name,str);
	co.sign(mykey,{'keyName':mykeyname});
	
	try {
            ndn.send(co);
	} 
	catch (e) {
            console.log(e.toString());
	}
    }
    console.log('end');
}

function onChatData(inst,co){
    console.log("Chat ContentObject received in callback");
    console.log('name'+co.name.to_uri());

    var content = JSON.parse(DataUtils.toString(co.content));
    var name = DataUtils.toString(co.name.components[3]);
    if (content.type =="chat"){
        //display on the screen
        //var d = new Date();//get time
        //var t = d.toLocaleTimeString();
        var d = new Date(content.time);
        var t = d.toLocaleTimeString();
        document.getElementById('txt').innerHTML +='<p><grey>'+ name+'-'+t+':</grey><br />'+content.msg+'</p>';
	var objDiv = document.getElementById("txt");      
	objDiv.scrollTop = objDiv.scrollHeight;
    }
    else if(content.type == "leave"){
        var n = rosterfind(name);
        roster.splice(n,1);
	document.getElementById('menu').innerHTML = '<p><b>Member</b></p><ul>';
	for(var i = 0;i<roster.length;i++){
	    document.getElementById('menu').innerHTML += '<li>'+roster[i]+'</li>';
	}
        document.getElementById('menu').innerHTML += '</ul>';
        console.log(name+" leave");
    }
}

var rosterfind = function (name) {
    for (var i = 0;i<roster.length;i++){
        if(roster[i].name == name){
            return i;
        }
    }
};

function heartbeat(){
    usrseq++;
    console.log("heartbeat:"+usrseq);//////
    var content = [{name:usrname,seqno:usrseq}];
    //console.log(content);
    var d = new Date();
    var t = d.getTime();
    msgcache.push({seqno:usrseq,msgtype:"heartbeat",msg:"xxx",time:t});
    while (msgcache.length>maxmsgcachelength)
        msgcache.shift();
    var str = JSON.stringify(content);
    var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
    n.append(DataUtils.toNumbers(digest_tree.root));
    var co = new ContentObject(n, str);
    co.sign(mykey, {'keyName':mykeyname});
    try {
	    ndn.send(co);
    } catch (e) {
	    console.log(e.toString());
    }
    digest_tree.update(content);
    if(logfind(digest_tree.root)==-1){
	console.log("heartbeat log add");
	var newlog = {digest:digest_tree.root, data:content};
	digest_log.push(newlog);
	console.log("addlog:"+digest_tree.root);
	var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
	n.append(DataUtils.toNumbers(digest_tree.root));
	var template = new Interest();
	template.interestLifetime = 10000;
	ndn.expressInterest(n, template, onSyncData, sync_timeout);                
	console.log('Heartbeat Interest expressed.');
    }         
}

function SendMessage(){
    var chatmsg = document.getElementById('fname').value;
    if(chatmsg != ""){
	document.getElementById('fname').value = "";
	usrseq++;
	console.log("sendmessage:"+usrseq);
	var content = [{name:usrname,seqno:usrseq}];
	var d = new Date();
	var t = d.getTime();
	msgcache.push({seqno:usrseq,msgtype:"chat",msg:chatmsg,time:t});
	while (msgcache.length>maxmsgcachelength)
            msgcache.shift();
	var str = JSON.stringify(content);
	var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
	n.append(DataUtils.toNumbers(digest_tree.root));
	var co = new ContentObject(n, str);
	co.sign(mykey, {'keyName':mykeyname});
	try {
	    ndn.send(co);
	} catch (e) {
	    console.log(e.toString());
	}
	digest_tree.update(content);
	if(logfind(digest_tree.root)==-1){
	    console.log("message log add");
	    var newlog = {digest:digest_tree.root, data:content};
	    digest_log.push(newlog);
	    console.log("addlog:"+digest_tree.root);
	    var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
	    n.append(DataUtils.toNumbers(digest_tree.root));
	    var template = new Interest();
	    template.interestLifetime = 10000;
	    ndn.expressInterest(n, template, onSyncData, sync_timeout);              
	    console.log('Sync Interest expressed.');
	    var tt = d.toLocaleTimeString();
	    document.getElementById('txt').innerHTML += '<p><grey>'+ usrname+'-'+tt+':</grey><br />'+chatmsg + '</p>';          
	    var objDiv = document.getElementById("txt");      
	    objDiv.scrollTop = objDiv.scrollHeight;
	}
    }
    else
	alert("message cannot be empty");
}

function Leave(){
    alert("Leaving the Chatroom...");
    var i = 0;
    usrseq++;
    var content = [{name:usrname,seqno:usrseq}];
    var d = new Date();
    var t = d.getTime();
    msgcache.push({seqno:usrseq,msgtype:"leave",msg:"xxx",time:t});
    while (msgcache.length>maxmsgcachelength)
        msgcache.shift();
    var str = JSON.stringify(content);
    var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
    n.append(DataUtils.toNumbers(digest_tree.root));
    var co = new ContentObject(n, str);
    co.sign(mykey, {'keyName':mykeyname});
    try {
	ndn.send(co);
    } catch (e) {
	console.log(e.toString());
    }
    digest_tree.update(content);
    console.log("leave log add");
    var newlog = {digest:digest_tree.root, data:content};
    digest_log.push(newlog);
    console.log("addlog:"+digest_tree.root);
    setTimeout(function(){window.close();},2000);	
    //window.close();
}

function alive(temp_seq,name){
    console.log("check alive");
    var index_n = digest_tree.find(name);
    var n = roster.indexOf(name);
    //console.log("name:"+name);
    //console.log("seqno"+temp_seq);
    if (index_n != -1){
	var seq = digest_tree.digestnode[index_n].seqno;
	if(temp_seq == seq){
	    roster.splice(n,1);
	    console.log(name+" leave");
	    document.getElementById('menu').innerHTML = '<p><b>Member</b></p>';
	    for(var i = 0;i<roster.length;i++){
		document.getElementById('menu').innerHTML += '<p>'+roster[i]+'</p>';
	    }
	}
    }
}
