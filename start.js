/**
 *   Copyright (C) 2013 Regents of the University of California 
 *   Authors:   Qiuhan Ding <dingqiuhan@gmail.com>, Wentao Shang <wentaoshang@gmail.com>
 *   BSD License, see LICENSE file. 
 *   
 *   Start NDN And Initialize Variables. 
 *   The prefix for chat interest name is fetched through auto configure by sending interest to '/local/ndn/prefix'
 *   
 */

function ChronoChat () {
    prefix_name = getRandomString();
    chat = new Chat();
    sync = new ChronoSync(chat.sendInterest.bind(chat),chat.initial.bind(chat),chatroom,session);
    sync.digest_log.push({digest:"00",data:[]});
    face = new Face({host:hub});

    chat_prefix = new Name(hubPrefix).append(chatroom).append(prefix_name).toUri();
    sync.chat_prefix = chat_prefix;
    var n1 = new Name(sync.prefix+chatroom+'/');
    face.registerPrefix(n1,sync.onInterest.bind(sync));
    console.log('sync prefix registered.');

    var n2 = new Name(chat_prefix);
    face.registerPrefix(n2,chat.onInterest.bind(chat));
    console.log('data prefix registered.');
    var n = new Name(sync.prefix+chatroom+'/00');
    var template = new Interest();
    template.setInterestLifetimeMilliseconds(1000);
    template.setAnswerOriginKind(Interest.ANSWER_NO_CONTENT_STORE);
    face.expressInterest(n, template, sync.onData.bind(sync), sync.initialTimeOut.bind(sync));
    console.log("initial sync express");
    console.log(n.toUri());
    
    console.log('Started...');
    
}

//Enable sending msg by pressing 'Enter'
function checkkey(event){
    if(event.keyCode==13){
    chat.SendMessage();
    }
}
