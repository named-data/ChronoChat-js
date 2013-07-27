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
	objectStore.add({key:0,digest:"",data:[{name:usrname,seqno:0}]});
    };
    request.onsuccess = function(event){
	db = request.result;
	console.log("open database");
    };
}

function onSyncInterest(inst){
    //search if the digest is already exist in the digest log
    console.log('Interest received in callback.');
    console.log(inst.name.to_uri());
    var syncdigest;
    if(inst.name.components.length<5){
	syncdigest = "";
    }
    else
	syncdigest = DataUtils.toHex(inst.name.components[4]);
    console.log(syncdigest);
    console.log(digest_tree.root);
    if(syncdigest != digest_tree.root){
	var ob_store = db.transaction(usrname).objectStore(usrname);
	var index = ob_store.index("digest");
	index.get(syncdigest).onsuccess = function(event){
	    var content = [];
	    //console.log(event.target.result);
	    if(event.target.result!=null){
		var logseq_t = event.target.result.key;//var logseq_t = event.target.result;
		console.log("logseq_t:"+logseq_t);
		var range = IDBKeyRange.lowerBound(logseq_t, true);
		var data_name = [];
		var data_seq = [];
		ob_store.openCursor(range).onsuccess = function(event){
		    var cursor = event.target.result;
		    if(cursor){
			var temp = cursor.value.data;
		    //getting the latest seqno of usrs who update after that digest
			for(var i = 0;i<temp.length;i++){
			    var n = data_name.indexOf(temp[i].name);
			    if(n == -1){
				data_name.push(temp[i].name);
				data_seq.push(temp[i].seqno);
			    }
			    else
				data_seq[n] = temp[i].seqno;
			}
			cursor.continue();
		    }
		    else{
			if(digest_tree.root == "unavailable"){
			    var n = data_name.indexOf(usrname);
			    if(n==-1){
				data_name.push(usrname);
				data_seq.push("unavailable");
			    }
			    else{
				data_seq[n] = "unavailable";
			    }
			}
			for(var i = 0;i<data_name.length;i++){
			    content[i] = { name:data_name[i],seqno:data_seq[i]};
			}
			var str = JSON.stringify(content);
			var co = new ContentObject(inst.name, str);
			co.sign(mykey, {'keyName':mykeyname});
			try {
			    ndn.send(co);
			    if(digest_tree.root == "unavailable")
				leaveflag = 1;
			} catch (e) {
			    console.log(e.toString());
			}
		    }
		}
		ob_store.openCursor(range).onerror = function(event){
		    console.log("openCursor error");
		}
	    }
	    else{
		console.log("unknown interest");
	    }
	};
	index.get(syncdigest).onerror = function(event){
	    console.log("search error");
		//code to fill!!!! recovery!!!!
	};
		
    }
}


function addlog(content){
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
    console.log("ContentObject received in callback");
    console.log('name:'+co.name.to_uri());
    var content = JSON.parse(DataUtils.toString(co.content));
    digest_tree.update(content);
    for(var i = 0; i<content.length;i++){
	if(content[i].seqno == "unavailable"){
	    content.splice(i,1);
	    i=i-1;
	}
    }	
    addlog(content);
    for(var i = 0; i<content.length;i++){
        var n = new Name('/ndn/'+content[i].name+'/chronos/'+chatroom+'/'+content[i].seqno);
        var template = new Interest();
        template.answerOriginKind = Interest.ANSWER_NO_CONTENT_STORE;
        template.interestLifetime = 1000;
        ndn.expressInterest(n, template, onChatData, chat_timeout);
        console.log(n.to_uri());
        console.log('Chat Interest expressed.');
    }
    if(usrseq == 0){
	usrseq++;
	var content = [{name:usrname,seqno:usrseq}];
	console.log(digest_tree.root);
	digest_tree.update(content);
	console.log(digest_tree.root);
	addlog(content);
	var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
	n.append(DataUtils.toNumbers(digest_tree.root));
	var template = new Interest();
	template.answerOriginKind = Interest.ANSWER_NO_CONTENT_STORE;
	template.interestLifetime = 1000;
	ndn.expressInterest(n, template, onSyncData, sync_timeout);
	//assume that the everyone except the new comer is in the static state
	var myVar = setInterval(function(){heartbeat()},2000);
    }
}
