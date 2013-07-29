var sync_timeout = function(interest) {
        console.log("Sync Interest time out.");
        console.log('Sync Interest name: ' + interest.name.to_uri());
	var component;
	if(interest.name.components.length<5){
		component = "";
	}
	else{
		component = DataUtils.toHex(interest.name.components[4]);
	}
	a++;
	console.log(component);
	if(component == digest_tree.root){
	  	var n = new Name(interest.name);
	  	var template = new Interest();
	  	template.answerOriginKind = Interest.ANSWER_NO_CONTENT_STORE;
	  	template.interestLifetime = 10000;
	  	ndn.expressInterest(n, template, onSyncData, sync_timeout);
		console.log("Syncinterest expressed:");
	        //console.log(template.name.to_uri());
	}                  
};

var chat_timeout = function(interest){
        console.log("no chat data coming back");
        var n = rosterfind(interest.name.components[1]);
        roster[n].chat_count++;
        if(roster[n].chat_count == max_wait){
            roster.splice(n,1);
        }
    };

    var initial_timeout = function(interest){
        console.log("no other people");
        //addlog([{name:usrname,seqno:usrseq}]);
        digest_tree.initial();
        addlog([{name:usrname,seqno:usrseq}]);
	var n = new Name('/ndn/broadcast/chronos/'+chatroom+'/');
	n.append(DataUtils.toNumbers(digest_tree.root));
	var template = new Interest();
	template.answerOriginKind = Interest.ANSWER_NO_CONTENT_STORE;
	template.interestLifetime = 10000;
	ndn.expressInterest(n, template, onSyncData, sync_timeout);
	console.log("Syncinterest expressed:");
	//console.log(template.name.to_uri());
        //setTimeout(function(){heartbeat();},60000);
        var myVar = setInterval(function(){heartbeat();},60000);
    };
