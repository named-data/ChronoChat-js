function logfind(digest){
    for(var i = 0;i<digest_log.length;i++){
	if(digest == digest_log[i].digest)
	    return i;
    }
    return -1;
}

function onSyncInterest(inst){
    //search if the digest is already exist in the digest log
    console.log('Sync Interest received in callback.');
    console.log(inst.name.to_uri());
    //var digest = DataUtils.toHex(inst.name.components[4])
    if(inst.name.components.length == 6 || digest == "0000"){/////////start recovery
        console.log("send back recovery data");
	var syncdigest;
	if(inst.name.components.length == 6)
	    syncdigest = DataUtils.toHex(inst.name.components[5]);
	else
	    syncdigest = "0000";
	var content = [];
	for(var i = 0;i<digest_tree.digestnode.length;i++){
	    content[i] = {name:digest_tree.digestnode[i].prefix_name,seqno:digest_tree.digestnode[i].seqno};
	}
	if(content.length!=0){
	    var str = JSON.stringify(content);
	    var co = new ContentObject(inst.name, str);
	    co.sign(mykey, {'keyName':mykeyname});
	    try {
		ndn.send(co);
	    } catch (e) {
		console.log(e.toString());
	    }
	}
    }
    else{
	var syncdigest = DataUtils.toHex(inst.name.components[4]);
	console.log("syncdigest: "+syncdigest);
	console.log("root: "+digest_tree.root);
	if(syncdigest != digest_tree.root){
	    var index = logfind(syncdigest);
	    var content = [];
	    function process_syncdata(index,syncdigest_t){
		var data_name = [];
		var data_seq = [];
		console.log(digest_log.length);
		for(var j = index+1;j<digest_log.length;j++){
		    var temp = digest_log[j].data;
		    //console.log(j);
		    for(var i = 0;i<temp.length;i++){
			//console.log(i);
			var n = data_name.indexOf(temp[i].name);
			if(n = -1){
			    data_name.push(temp[i].name);
			    data_seq.push(temp[i].seqno);
			}
			else
			    data_seq[n] = temp[i].seqno;
		    }
		}
		console.log("search log finished");
		for(var i = 0;i<data_name.length;i++){
		    content[i] = { name:data_name[i],seqno:data_seq[i]};
		}
		if(content.length!=0){
		    var str = JSON.stringify(content);
                    var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
		    n.append(DataUtils.toNumbers(syncdigest_t));
		    var co = new ContentObject(n, str);
		    co.sign(mykey, {'keyName':mykeyname});
		    try {
			ndn.send(co);
			console.log("Sync Data send");
		    } catch (e) {
			console.log(e.toString());
		    }
		}
	    }
	    
	    function recovery(syncdigest_t){
		var index2 = logfind(syncdigest_t);
		console.log(index2);
		console.log(digest_log);
		if(index2 != -1){
		    process_syncdata(index2,syncdigest_t);
		}
		else{
		    console.log("unknown digest: ")
		    console.log(syncdigest_t);
		    console.log(digest_tree.root);
		    var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/recovery/');
		    n.append(DataUtils.toNumbers(syncdigest_t));
		    var template = new Interest();
		    //template.answerOriginKind = Interest.ANSWER_NO_CONTENT_STORE;
		    template.interestLifetime = 10000;
		    ndn.expressInterest(n, template, onSyncData, sync_timeout);
		    console.log("Recovery Syncinterest expressed:"); 
		}
		console.log('end of recover');
	    }

	    if(index == -1){
		setTimeout(function(){recovery(syncdigest);},2000);
		console.log("set timer recover");
	    }
	    else{
		process_syncdata(index,syncdigest);
	    }
	}
    }
}

function onSyncData(inst,co){
    console.log("Sync ContentObject received in callback");
    console.log('name:'+co.name.to_uri());
    var content = JSON.parse(DataUtils.toString(co.content));
    console.log(DataUtils.toString(co.content));
    console.log(content);
    if(digest_tree.root == "0000"){
    	digest_tree.update(content);
    //console.log(content);
	if(logfind(digest_tree.root)==-1){
    	    console.log("sync log add");
	    var newlog = {digest:digest_tree.root, data:content};
	    digest_log.push(newlog);
	    console.log("addlog:"+digest_tree.root);
	}
	var digest_t = digest_tree.root;
        for(var i = 0;i<content.length;i++){
	    if(content[i].name == usrname){
		var content_t = [{name:content[i].name,seqno:content[i].seqno+1}];
		digest_tree.update(content);
                console.log(content_t);
		if(logfind(digest_tree.root)==-1){
		    var newlog = {digest:digest_tree.root, data:content};
		    digest_log.push(newlog);
		    console.log("addlog:"+digest_tree.root);
		    var d = new Date();
		    var t = d.getTime();
		    msgcache.push({seqno:usrseq,msgtype:"join",msg:"xxx",time:t});
      		    while (msgcache.length>maxmsgcachelength)
        		msgcache.shift();
		}
	    }
	}
	var content_t =[]
	if(usrseq>=0){
	    content_t[0] = {name:usrname,seqno:usrseq};
	}
	else
	    content_t[0] = {name:usrname,seqno:0};
	var str = JSON.stringify(content_t);
	var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
	n.append(DataUtils.toNumbers(digest_t));
	var co = new ContentObject(n, str);
	co.sign(mykey, {'keyName':mykeyname});
	try {
	    console.log('before send');
	    ndn.send(co);
	  
	} catch (e) {
	    console.log(e.toString());
	}
	//var myVar = setInterval(function(){heartbeat();},60000);
    }
    else{
        digest_tree.update(content);
        //console.log(content);
	if(logfind(digest_tree.root)==-1){
    	    console.log("sync log add");
    	    var newlog = {digest:digest_tree.root, data:content};
	    digest_log.push(newlog);
	    console.log("addlog:"+digest_tree.root);
	    for(var i = 0; i<content.length;i++){
		if(content[i].name!=usrname){
		    var n = new Name('/ndn/ucla.edu/irl/'+content[i].name+'/'+chatroom+'/'+content[i].seqno);
		    var template = new Interest();
		    //template.answerOriginKind = Interest.ANSWER_NO_CONTENT_STORE;
		    template.interestLifetime = 10000;
		    ndn.expressInterest(n, template, onChatData, chat_timeout);
		    console.log(n.to_uri());
		    console.log('Chat Interest expressed.');
		}
	    }
	}
    }
    if(usrseq <0){//the user haven't put himself in the digest tree
	console.log("initial state")
	usrseq = 0;
	var content = [{name:usrname,seqno:usrseq}];
	//console.log(digest_tree.root);
	digest_tree.update(content);
	//console.log(digest_tree.root);
	if(logfind(digest_tree.root)==-1){
	    console.log("initial log add");
	    var newlog = {digest:digest_tree.root, data:content};
	    digest_log.push(newlog);
	    console.log("addlog:"+digest_tree.root);
	    var myVar = setInterval(function(){heartbeat();},60000);
	//setTimeout(function(){heartbeat();},60000);
	}
    }
    var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
    n.append(DataUtils.toNumbers(digest_tree.root));
    var template = new Interest();
    //template.answerOriginKind = Interest.ANSWER_NO_CONTENT_STORE;
    template.interestLifetime = 10000;
    ndn.expressInterest(n, template, onSyncData, sync_timeout);
    console.log("Syncinterest expressed:");
    console.log(n.to_uri());
	//console.log(template.name.to_url());
	//assume that the everyone except the new comer is in the static state
	//var myVar = setInterval(function(){heartbeat()},60000);
}
