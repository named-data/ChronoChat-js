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
	if(component == digest_tree.root&&a<5){
	  	var n = new Name(interest.name);
	  	var template = new Interest();
	  	template.answerOriginKind = Interest.ANSWER_NO_CONTENT_STORE;
	  	template.interestLifetime = 1000;
	  	ndn.expressInterest(n, template, onSyncData, sync_timeout);
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
        heartbeat();
        //var myVar = setInterval(function(){heartbeat()},6000);
    };
