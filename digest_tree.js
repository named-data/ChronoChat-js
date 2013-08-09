/**
 *   Copyright (C) 2013 Regents of the University of California 
 *   Authors:   Qiuhan Ding <dingqiuhan@gmail.com>, Wentao Shang <wentaoshang@gmail.com>
 *   BSD License, see LICENSE file. 
 *   
 *   Digest_Tree Object
 */

var Digest_Tree = function Digest_Tree() {
    this.digestnode = [];
    this.root = '00';
};

//Initialize after the first interest timeout
Digest_Tree.prototype.initial = function(self) {
    var md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    md.updateHex(Int32ToHex(self.session)+Int32ToHex(0));
    var digest_seq = md.digest();
    md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    md.updateString(self.chat_prefix);
    var digest_name = md.digest();

    md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    md.updateHex(digest_name+digest_seq);

    this.digestnode[0] = {"prefix_name":self.chat_prefix,"seqno":{seq:0,session:self.session},"digest":md.digest()};
    md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    md.updateHex(this.digestnode[0].digest);
    this.root = md.digest();
    //console.log(this);
    
};

//Add new comer to the tree
Digest_Tree.prototype.newcomer = function(name,seqno,self){
    //console.log(seqno);
    var md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    if(self.chat_prefix == name){
    	self.usrseq = seqno.seq;
    }
    md.updateHex(Int32ToHex(seqno.session)+Int32ToHex(seqno.seq));
    var digest_seq = md.digest();
    md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    md.updateString(name);
    var digest_name = md.digest();
    md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    md.updateHex(digest_name+digest_seq);

    var temp = {"prefix_name":name,"seqno":{seq:seqno.seq,session:seqno.session},"digest":md.digest()};
    console.log("new comer "+name+','+seqno.seq+','+seqno.session);
    this.digestnode.push(temp);
    this.digestnode.sort(sortdigestnode);
    var md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    for(var i = 0;i<this.digestnode.length;i++){
	md.updateHex(this.digestnode[i].digest);
    }
    this.root = md.digest();
};

//Update the digest_tree when get some new data
Digest_Tree.prototype.update = function (content,self) {
    for(var i = 0;i<content.length;i++){
	if(content[i].type ==0){
	    var n_index = this.find(content[i].name,content[i].seqno.session);
	    console.log(content[i].name,content[i].seqno.session);
	    console.log("n_index:"+n_index);
            if( n_index != -1){
	    //only update the newer status
	        if(this.digestnode[n_index].seqno.seq<content[i].seqno.seq){
                    if(self.chat_prefix == content[i].name){
		        self.usrseq = content[i].seqno.seq;
            	    }
		    this.digestnode[n_index].seqno ={seq:content[i].seqno.seq,session:content[i].seqno.session};
		    this.digestnode[n_index].prefix_name = content[i].name;
		    var md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
                    md.updateHex(Int32ToHex(content[i].seqno.session)+Int32ToHex(content[i].seqno.seq));
    		    var digest_seq = md.digest();
    		    md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    		    md.updateString(content[i].name);
    		    var digest_name = md.digest();
    		    md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    		    md.updateHex(digest_name+digest_seq);

		    this.digestnode[n_index].digest =md.digest();
                }
	    }
            else{
            	this.newcomer(content[i].name,content[i].seqno,self);
	    }
        }
    }
    var md = new KJUR.crypto.MessageDigest({alg: "sha256", prov: "cryptojs"});
    for(var i = 0;i<this.digestnode.length;i++){
	md.updateHex(this.digestnode[i].digest);
    }
    this.root = md.digest();
    console.log("update root to: "+this.root);
    usrdigest = this.root;
};

function sortdigestnode(node1,node2){
    if((node1.prefix_name>node2.prefix_name)||((node1.prefix_name == node2.prefix_name)&&node1.seqno.session>node2.seqno.session))
	return 1;
    else
	return -1;
}

Digest_Tree.prototype.find = function (name,session) {
    for (var i = 0;i<this.digestnode.length;i++){
        if(this.digestnode[i].prefix_name == name && this.digestnode[i].seqno.session == session){
            return i;
        }
    }
    return -1;
};

//Covert Int32 number to hex string
function Int32ToHex (value) {
   var result = new Uint8Array(4);
   for (var i = 0; i < 4; i++) {
result[i] = value % 256;
value = Math.floor(value / 256);
   }
   return DataUtils.toHex(result);
}
