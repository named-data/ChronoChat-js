function prefixData(inst,co){
    console.log("prefix ContentObject received in callback");
    console.log('name'+co.name.to_uri());
    chat_prefix = DataUtils.toString(co.content).trim()+'/'+chatroom+'/'+prefix_name;/////
    sync.chat_prefix = chat_prefix;
    var n1 = new Name(sync.prefix+chatroom+'/');
    ndn.registerPrefix(n1,sync.onInterest.bind(sync));
    console.log('sync prefix registered.');
    //var n2 = new Name(chat_prefix+'/'+screen_name+'/'+chatroom);
    var n2 = new Name(chat_prefix);
    ndn.registerPrefix(n2,chat.onInterest.bind(chat));
    console.log('data prefix registered.');
    var n = new Name(sync.prefix+chatroom+'/00');//.append(DataUtils.toNumbers('00'));
    var template = new Interest();
    template.interestLifetime = 1000;
    template.answerOriginKind = Interest.ANSWER_NO_CONTENT_STORE;
    ndn.expressInterest(n, template, sync.onData.bind(sync), sync.initialTimeOut.bind(sync));
    console.log("initial sync express");
    console.log(n.to_uri());
     
}

function prefixTimeOut(inst){
    console.log("prefix Interest time out");
    console.log('name'+inst.name.to_uri());
};
