//digest log
//var dbName = "ChronosChat_db";
//var usrname = "qiuhan";//will change in the future
function InitialLog(usrname){
    window.indexedDB.deleteDatabase(dbName);
    var request = window.indexedDB.open(dbName);
    request.onerror = function(event){
	console.log('database open error');
    };
    request.onupgradeneeded = function(event){
	var db0 = event.target.result;
	var objectStore = db0.createObjectStore(usrname,{keyPath:"key"});
	objectStore.createIndex("digest","digest",{unique:true});
	objectStore.createIndex("data","data",{unique:false});
	objectStore.add({key:0,digest:"",data:[]});
    };
    request.onsuccess = function(event){
	db = request.result;
	console.log("open database");
    };
}

function onSyncInterest(inst){
    //search if the digest is already exist in the digest log
    console.log('Sync Interest received in callback.');
    console.log(inst.name.to_uri());
    if(inst.name.components.length == 6){/////////start recovery
	syncdigest = DataUtils.toHex(inst.name.components[5]);
	var ob_store = db.transaction(usrname).objectStore(usrname);
	var index = ob_store.index("digest");
	index.get(syncdigest).onsuccess = function(event){
	    if(event.target.result!=null){
		var content = [];
		for(var i = 0;i<digest_tree.digestnode.length;i++){
		    content[i] = {name:digest_tree.digestnode[i].prefix_name,seqno:digest_tree.digestnode[i].seqno};
		}
		var str = JSON.stringify(content);
		var co = new ContentObject(inst.name, str);
		co.sign(mykey, {'keyName':mykeyname});
		try {
		    ndn.send(co);
		} catch (e) {
		    console.log(e.toString());
		}
	    }
	};
	index.get(syncdigest).onerror = function(event){
	    console.log("search error");
	};
    }
    else{
	var syncdigest;
	if(inst.name.components.length<5){
	    syncdigest = "";
	}
	else
	    syncdigest = DataUtils.toHex(inst.name.components[4]);
	console.log("syncdigest: "+syncdigest);
	console.log("root: "+digest_tree.root);
	if(syncdigest != digest_tree.root){
	    var ob_store = db.transaction(usrname).objectStore(usrname);
	    var index = ob_store.index("digest");
	    index.get(syncdigest).onsuccess = function(event){
		var content = [];
		
		function process_syncdata(event){
		    var logseq_t = event.target.result.key;
		    var range = IDBKeyRange.lowerBound(logseq_t, true);
		    var data_name = [];
		    var data_seq = [];
		    var ob_store =  db.transaction(usrname).objectStore(usrname);
		    ob_store.openCursor(range).onsuccess = function(event){
			var cursor = event.target.result;
			if(cursor){
			    var temp = cursor.value.data;
			    //getting the latest seqno of usrs who update after that digest
			    for(var i = 0;i<temp.length;i++){
				var n = data_name.indexOf(temp[i].name);
				if(n == -1){
				    if(roster.indexOf(temp[i].name)!=-1){//the people who leave will not be included in to data packet
				        data_name.push(temp[i].name);
				        data_seq.push(temp[i].seqno);
				    }
				}
				else
				    data_seq[n] = temp[i].seqno;
			    }
			    cursor.continue();
			}
			else{
			    	console.log("search finished");
			    	for(var i = 0;i<data_name.length;i++){
					content[i] = { name:data_name[i],seqno:data_seq[i]};
			    	}
			    	var str = JSON.stringify(content);
			    	var co = new ContentObject(inst.name, str);
			    	co.sign(mykey, {'keyName':mykeyname});
			    	try {
					ndn.send(co);
					console.log("Sync Data send");
			    	} catch (e) {
					console.log(e.toString());
			    	}
			}
		    }
		    ob_store.openCursor(range).onerror = function(event){
			console.log("openCursor error");
		    }
		}


		function recovery(){
		    var ob_store2 = db.transaction(usrname).objectStore(usrname);
		    var index2 = ob_store2.index("digest");
		    index2.get(syncdigest).onsuccess = function(event2){
			if(event2.target.result!=null){
			    process_syncdata(event2,ob_store2);
			}
			else{
			    console.log("unknown digest:")
			    console.log(syncdigest);
			    console.log(digest_tree.root);
			    var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/recovery/');
			    n.append(DataUtils.toNumbers(syncdigest));
			    var template = new Interest();
			    //template.answerOriginKind = Interest.ANSWER_NO_CONTENT_STORE;
			    template.interestLifetime = 10000;
			    ndn.expressInterest(n, template, onSyncData, sync_timeout);
			    console.log("Recovery Syncinterest expressed:");
			}
		    };
		    index2.get(syncdigest).onerror = function(event2){
			console.log("search error");
		    };
		}

		//console.log(event.target.result);
		if(event.target.result==null){
		    setTimeout(function(){recovery();},2000)///the waiting time can be random
		}
		else{
		    process_syncdata(event);
		    
		}
	    };
	    index.get(syncdigest).onerror = function(event){
		console.log("search error");
	    };
	    
	}
    }
}

function addlog(content){
    console.log("usrseq before adding log:"+usrseq);
    //digest_tree.update(content);
    var newlog = {key:logseq,digest:digest_tree.root, data:content};
    logseq++;
    //console.log(content[0].seqno);////////
    console.log("addlog:"+digest_tree.root);
    var ob_store = db.transaction(usrname,"readwrite").objectStore(usrname);
    var addlog = ob_store.add(newlog); 
    addlog.onsuccess = function(event){
	console.log("log added");
    }
    addlog.onerror = function(event){
	console.log("new log cannot be inserted")
    };          
}

function onSyncData(inst,co){
    console.log("Sync ContentObject received in callback");
    console.log('name:'+co.name.to_uri());
    var content = JSON.parse(DataUtils.toString(co.content));
    //console.log(content);
    if(digest_tree.root.length == 0){
    	digest_tree.update(content);
    //console.log(content);
    	console.log("sync log add");
    	addlog(content);
        for(var i = 0;i<content.length;i++){
	    if(content[i].name == usrname){
		var content_t = [{name:content[i].name,seqno:content[i].seqno+1}];
                console.log(content_t);
		digest_tree.update(content_t);
		addlog(content_t);
		msgcache.push({seqno:usrseq,msgtype:"join",msg:"xxx"});
      		while (msgcache.length>maxmsgcachelength)
        	    msgcache.shift();
	    }        
	}
    }
    else{
        digest_tree.update(content);
        //console.log(content);
    	console.log("sync log add");
    	addlog(content);
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
    if(usrseq <0){
	console.log("initial state")
	usrseq = 0;
	var content = [{name:usrname,seqno:usrseq}];
	//console.log(digest_tree.root);
	digest_tree.update(content);
	//console.log(digest_tree.root);
	console.log("initial log add");
	addlog(content);
	var myVar = setInterval(function(){heartbeat();},60000);
	//setTimeout(function(){heartbeat();},60000);
    }
	var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
	n.append(DataUtils.toNumbers(digest_tree.root));
	var template = new Interest();
	//template.answerOriginKind = Interest.ANSWER_NO_CONTENT_STORE;
	template.interestLifetime = 10000;
	ndn.expressInterest(n, template, onSyncData, sync_timeout);
	console.log("Syncinterest expressed:");
	//console.log(template.name.to_url());
	//assume that the everyone except the new comer is in the static state
	//var myVar = setInterval(function(){heartbeat()},60000);
}
